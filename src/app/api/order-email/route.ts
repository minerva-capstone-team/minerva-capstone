import { NextResponse, type NextRequest } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { isEmailConfigured, sendOrderEmails, type OrderEmailData } from "@/lib/email";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Envía el email de confirmación de un pedido recién creado.
 * claim_order_email() solo devuelve el pedido una vez y durante 15 minutos,
 * así que este endpoint no sirve para reenviar correos ni leer pedidos ajenos.
 */
export async function POST(req: NextRequest) {
  const { orderId } = (await req.json().catch(() => ({}))) as { orderId?: string };
  if (!orderId || !UUID.test(orderId)) return NextResponse.json({ error: "bad request" }, { status: 400 });
  if (!isEmailConfigured) return NextResponse.json({ error: "email not configured" }, { status: 503 });
  const sb = getServerSupabase();
  if (!sb) return NextResponse.json({ error: "not configured" }, { status: 503 });

  const { data, error } = await sb.rpc("claim_order_email", { p_order_id: orderId });
  if (error) return NextResponse.json({ error: "lookup failed" }, { status: 500 });
  if (!data) return NextResponse.json({ error: "not found" }, { status: 404 });

  const errors = await sendOrderEmails(data as OrderEmailData);
  if (errors.length) {
    console.error("Resend:", errors);
    return NextResponse.json({ error: "send failed" }, { status: 502 });
  }
  return NextResponse.json({ sent: true });
}
