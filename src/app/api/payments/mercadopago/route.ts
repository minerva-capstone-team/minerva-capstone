import { NextResponse, type NextRequest } from "next/server";
import { createPreference, isMercadoPagoConfigured } from "@/lib/mercadopago";
import { getServiceSupabase } from "@/lib/supabase/service";
import { site } from "@/lib/site";
import { esc, notifyAdmins } from "@/lib/telegram";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Inicia el pago de un pedido con Mercado Pago. El monto sale de la base de datos (nunca del
 * navegador) y solo se aceptan pedidos pendientes de pago y creados hace poco.
 */
export async function POST(req: NextRequest) {
  if (!isMercadoPagoConfigured) return NextResponse.json({ error: "not configured" }, { status: 503 });
  const sb = getServiceSupabase();
  if (!sb) return NextResponse.json({ error: "not configured" }, { status: 503 });

  const { orderId } = (await req.json().catch(() => ({}))) as { orderId?: string };
  if (!orderId || !UUID.test(orderId)) return NextResponse.json({ error: "bad request" }, { status: 400 });

  const [{ data: order, error }, { data: settings }] = await Promise.all([
    sb.from("orders").select("id,order_number,total,status,payment_status,created_at,customer:customers(first_name,last_name,email)").eq("id", orderId).maybeSingle(),
    sb.from("store_settings").select("reservation_hours").maybeSingle(),
  ]);
  if (error) {
    console.error("[mercadopago] pedido:", error.message);
    return NextResponse.json({ error: "lookup failed" }, { status: 500 });
  }
  if (!order) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (order.payment_status !== "pendiente" || order.status === "cancelado") return NextResponse.json({ error: "not payable" }, { status: 409 });

  const hours = Number(settings?.reservation_hours ?? 48);
  const ageHours = (Date.now() - new Date(order.created_at as string).getTime()) / 3_600_000;
  if (ageHours > hours) return NextResponse.json({ error: "expired" }, { status: 409 });

  const c = (Array.isArray(order.customer) ? order.customer[0] : order.customer) as { first_name: string; last_name: string; email: string } | null;
  try {
    const url = await createPreference({
      orderId: order.id as string,
      orderNumber: order.order_number as string,
      total: Number(order.total),
      email: c?.email ?? "",
      firstName: c?.first_name ?? "",
      lastName: c?.last_name ?? "",
      siteUrl: site.url,
      expiresInHours: Math.max(1, Math.floor(hours - ageHours)),
    });
    return NextResponse.json({ url });
  } catch (err) {
    const reason = (err as Error).message;
    console.error("[mercadopago] preferencia:", reason);
    // Aviso al equipo con la causa, para arreglarlo sin adivinar (el cliente ve su pedido con opción de reintentar).
    await notifyAdmins(`⚠️ <b>No se pudo iniciar el pago</b> de ${esc(order.order_number)}\n${esc(reason)}\nEl cliente puede reintentar o coordinar por WhatsApp. Usa /pagos para revisar la conexión.`);
    return NextResponse.json({ error: "payment provider error" }, { status: 502 });
  }
}
