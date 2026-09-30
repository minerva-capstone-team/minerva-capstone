import { NextResponse, type NextRequest } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { canEmailCustomers, isEmailConfigured, sendNoticeEmail } from "@/lib/email";
import { noticeFor, type NotifyKind, type NotifyOrder } from "@/lib/order-notify";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Avisa por email al cliente que su pedido cambió de etapa (o que ya salió con su código de Paket).
 * Solo administradores: se verifica el JWT con is_admin() y el mensaje se arma con el estado
 * REAL del pedido en la base de datos, no con lo que diga el navegador.
 */
export async function POST(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { orderId, kind } = (await req.json().catch(() => ({}))) as { orderId?: string; kind?: NotifyKind };
  if (!orderId || !UUID.test(orderId) || (kind !== "status" && kind !== "shipping")) return NextResponse.json({ error: "bad request" }, { status: 400 });

  const sb = getServerSupabase(token);
  if (!sb) return NextResponse.json({ error: "not configured" }, { status: 503 });
  const { data: isAdmin, error: adminErr } = await sb.rpc("is_admin");
  if (adminErr || !isAdmin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { data, error } = await sb
    .from("orders")
    .select("order_number,status,delivery_status,tracking_code,customer:customers(first_name,email)")
    .eq("id", orderId)
    .maybeSingle();
  if (error) return NextResponse.json({ error: "lookup failed" }, { status: 500 });
  if (!data) return NextResponse.json({ error: "not found" }, { status: 404 });

  const customer = (Array.isArray(data.customer) ? data.customer[0] : data.customer) as { first_name: string; email: string } | null;
  const notice = noticeFor(kind, data as unknown as NotifyOrder);
  if (!customer || !notice) return NextResponse.json({ sent: false, reason: "nothing to notify" });
  if (!isEmailConfigured) return NextResponse.json({ sent: false, reason: "email not configured" });
  if (!canEmailCustomers) return NextResponse.json({ sent: false, reason: "no verified domain" });

  const { error: sendErr } = await sendNoticeEmail(customer.email, customer.first_name, data.order_number, notice);
  if (sendErr) {
    console.error(`[notify-status] ${data.order_number} Resend:`, sendErr);
    return NextResponse.json({ error: "send failed" }, { status: 502 });
  }
  console.info(`[notify-status] ${data.order_number}: aviso "${kind}" enviado`);
  return NextResponse.json({ sent: true });
}
