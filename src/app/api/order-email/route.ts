import { NextResponse, type NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getServerSupabase } from "@/lib/supabase/server";
import { isEmailConfigured, sendOrderEmails, type OrderEmailData } from "@/lib/email";
import { isPushConfigured, sendPush, type PushSub } from "@/lib/push";
import { formatCLP } from "@/lib/format";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Channel = { sent: boolean; reason?: string };

async function emailChannel(sb: SupabaseClient, orderId: string): Promise<Channel> {
  const { data, error } = await sb.rpc("claim_order_email", { p_order_id: orderId });
  if (error) {
    console.error("[order-email] lookup:", error.message);
    return { sent: false, reason: "lookup failed" };
  }
  if (!data) return { sent: false, reason: "not found" };

  const order = data as OrderEmailData;
  const { attempted, ids, errors } = await sendOrderEmails(order);
  if (!attempted) {
    console.warn(
      `[order-email] ${order.order_number}: no se envió nada. Sin dominio propio solo se avisa a la tienda, y ORDER_NOTIFY_EMAIL está vacío en este despliegue.`,
    );
    return { sent: false, reason: "no recipients" };
  }
  if (errors.length) {
    console.error(`[order-email] ${order.order_number} Resend:`, errors);
    return { sent: false, reason: "send failed" };
  }
  console.info(`[order-email] ${order.order_number}: ${ids.length} email(s) enviados a Resend`, ids);
  return { sent: true };
}

async function pushChannel(sb: SupabaseClient, orderId: string): Promise<Channel> {
  const { data, error } = await sb.rpc("claim_order_push", { p_order_id: orderId });
  if (error) {
    console.error("[order-push] lookup:", error.message);
    return { sent: false, reason: "lookup failed" };
  }
  if (!data) return { sent: false, reason: "not found" };

  const o = data as { order_number: string; total: number; customer: string; subscriptions: PushSub[] };
  if (!o.subscriptions.length) {
    console.warn(`[order-push] ${o.order_number}: ningún dispositivo del admin tiene las notificaciones activadas.`);
    return { sent: false, reason: "no subscriptions" };
  }
  const { sent, dead, errors } = await sendPush(o.subscriptions, {
    title: `Nuevo pedido ${o.order_number}`,
    body: `${o.customer} · ${formatCLP(o.total)}`,
    url: "/admin/pedidos",
    tag: `order-${o.order_number}`,
  });
  await Promise.all(dead.map((endpoint) => sb.rpc("drop_push_endpoint", { p_endpoint: endpoint })));
  if (errors.length) console.error(`[order-push] ${o.order_number}:`, errors);
  console.info(`[order-push] ${o.order_number}: ${sent} notificación(es) enviadas, ${dead.length} suscripción(es) caducadas eliminadas`);
  return sent > 0 ? { sent: true } : { sent: false, reason: errors.length ? "send failed" : "expired" };
}

/**
 * Se llama justo después de crear un pedido: manda el email de confirmación / aviso a la tienda
 * y la notificación push a la app del admin. claim_order_email() y claim_order_push() entregan
 * cada pedido una sola vez y solo durante 15 minutos, así que este endpoint no sirve para
 * reenviar avisos ni leer pedidos ajenos.
 */
export async function POST(req: NextRequest) {
  const { orderId } = (await req.json().catch(() => ({}))) as { orderId?: string };
  if (!orderId || !UUID.test(orderId)) return NextResponse.json({ error: "bad request" }, { status: 400 });
  if (!isEmailConfigured && !isPushConfigured) return NextResponse.json({ error: "notifications not configured" }, { status: 503 });
  const sb = getServerSupabase();
  if (!sb) return NextResponse.json({ error: "not configured" }, { status: 503 });

  const [email, push] = await Promise.all([
    isEmailConfigured ? emailChannel(sb, orderId) : Promise.resolve<Channel>({ sent: false, reason: "not configured" }),
    isPushConfigured ? pushChannel(sb, orderId) : Promise.resolve<Channel>({ sent: false, reason: "not configured" }),
  ]);
  const notFound = [email, push].every((c) => c.reason === "not found" || c.reason === "not configured");
  return NextResponse.json({ email, push }, { status: notFound ? 404 : 200 });
}
