import { NextResponse, type NextRequest } from "next/server";
import { getPayment, isMercadoPagoConfigured, validWebhookSignature } from "@/lib/mercadopago";
import { getServiceSupabase } from "@/lib/supabase/service";
import { esc, notifyAdmins } from "@/lib/telegram";
import { formatCLP } from "@/lib/format";
import { site } from "@/lib/site";
import { canEmailCustomers, sendNoticeEmail } from "@/lib/email";
import { noticeFor, type NotifyOrder } from "@/lib/order-notify";

/**
 * Aviso de Mercado Pago. No confía en el contenido del aviso: consulta el pago en la API de
 * Mercado Pago y solo entonces marca el pedido como pagado (si el monto calza).
 * Responde siempre 200 para que Mercado Pago no reintente sin fin.
 */
export async function POST(req: NextRequest) {
  if (!isMercadoPagoConfigured) return NextResponse.json({ ok: false }, { status: 503 });
  const url = new URL(req.url);
  const body = (await req.json().catch(() => ({}))) as { type?: string; topic?: string; action?: string; data?: { id?: string | number } };
  const type = body.type ?? url.searchParams.get("type") ?? url.searchParams.get("topic");
  const dataId = String(body.data?.id ?? url.searchParams.get("data.id") ?? url.searchParams.get("id") ?? "");
  if (type !== "payment" || !/^\d+$/.test(dataId)) return NextResponse.json({ ok: true });

  if (!validWebhookSignature(req.headers.get("x-signature"), req.headers.get("x-request-id"), url.searchParams.get("data.id") ?? dataId)) {
    console.warn("[mercadopago] aviso con firma inválida, se ignora");
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  try {
    const payment = await getPayment(dataId);
    const sb = getServiceSupabase();
    if (!sb || !payment.external_reference) return NextResponse.json({ ok: true });

    const { data: order } = await sb
      .from("orders")
      .select("id,order_number,total,status,payment_status,delivery_status,tracking_code,customer:customers(first_name,email)")
      .eq("id", payment.external_reference)
      .maybeSingle();
    if (!order) return NextResponse.json({ ok: true });
    const c = (Array.isArray(order.customer) ? order.customer[0] : order.customer) as { first_name: string; email: string } | null;
    const link = [[{ text: "Ver pedido", url: `${site.url}/admin/pedidos?pedido=${encodeURIComponent(order.order_number as string)}` }]];

    if (payment.status === "approved") {
      if (order.payment_status === "pagado") return NextResponse.json({ ok: true }); // aviso repetido
      if (payment.currency_id !== "CLP" || payment.transaction_amount < Number(order.total)) {
        await notifyAdmins(`⚠️ <b>Pago con monto distinto</b> en ${esc(order.order_number)}: recibido ${formatCLP(payment.transaction_amount)}, pedido ${formatCLP(Number(order.total))}. Revísalo en Mercado Pago (pago ${esc(payment.id)}).`, link);
        return NextResponse.json({ ok: true });
      }
      const next: Record<string, unknown> = { payment_status: "pagado", payment_provider: "mercadopago", payment_ref: String(payment.id), paid_at: new Date().toISOString() };
      if (order.status === "pendiente") next.status = "confirmado";
      const { error } = await sb.from("orders").update(next).eq("id", order.id);
      if (error) {
        console.error("[mercadopago] no se pudo marcar pagado:", error.message);
        return NextResponse.json({ ok: false }, { status: 500 }); // que Mercado Pago reintente
      }
      console.info(`[mercadopago] ${order.order_number} pagado (pago ${payment.id})`);
      const cancelled = order.status === "cancelado";
      await notifyAdmins(
        cancelled
          ? `⚠️ <b>Pago recibido de un pedido cancelado</b> ${esc(order.order_number)} · ${formatCLP(payment.transaction_amount)}. Revisa stock o devuelve el pago.`
          : `💳 <b>Pago recibido</b> ${esc(order.order_number)} · ${formatCLP(payment.transaction_amount)}\n${esc(c?.first_name ?? "")} pagó con Mercado Pago. El pedido quedó confirmado.`,
        link,
      );
      if (!cancelled && c && canEmailCustomers) {
        const notice = noticeFor("status", { ...(order as unknown as NotifyOrder), status: "confirmado" });
        if (notice) await sendNoticeEmail(c.email, c.first_name, order.order_number as string, notice).catch(() => undefined);
      }
    } else if ((payment.status === "refunded" || payment.status === "charged_back") && order.payment_status === "pagado") {
      await sb.from("orders").update({ payment_status: "reembolsado" }).eq("id", order.id);
      await notifyAdmins(`↩️ <b>Pago devuelto</b> ${esc(order.order_number)} (${payment.status === "charged_back" ? "contracargo" : "reembolso"}).`, link);
    }
  } catch (err) {
    console.error("[mercadopago] webhook:", (err as Error).message);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
