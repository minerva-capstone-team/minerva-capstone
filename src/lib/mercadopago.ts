import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Mercado Pago (Checkout Pro): la clienta paga en la página de Mercado Pago y vuelve a la tienda.
 * El pedido se marca pagado SOLO cuando el webhook confirma el pago consultando la API de
 * Mercado Pago con el access token: nunca se confía en lo que diga el navegador.
 *
 * Variables (solo servidor, nunca en el código):
 *  - MP_ACCESS_TOKEN     access token de producción (APP_USR-…)
 *  - MP_WEBHOOK_SECRET   clave secreta de Webhooks (Tus integraciones → Webhooks); opcional pero recomendada
 */
const token = process.env.MP_ACCESS_TOKEN ?? "";
const webhookSecret = process.env.MP_WEBHOOK_SECRET ?? "";
/** Permite apuntar a un servidor falso en pruebas locales. */
const API = process.env.MP_API_URL || "https://api.mercadopago.com";

export const isMercadoPagoConfigured = Boolean(token);

async function mp<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(init.headers ?? {}) },
    signal: AbortSignal.timeout(15_000),
    cache: "no-store",
  });
  const body = (await res.json().catch(() => ({}))) as T & { message?: string };
  if (!res.ok) throw new Error(`Mercado Pago ${res.status}: ${body.message ?? "error"}`);
  return body;
}

/** Revisa que el token sirva y de qué cuenta es (para el comando /pagos del bot). */
export async function checkAccount(): Promise<{ ok: true; id: number; site: string } | { ok: false; reason: string }> {
  if (!token) return { ok: false, reason: "MP_ACCESS_TOKEN está vacío en este despliegue" };
  try {
    const u = await mp<{ id: number; site_id: string }>("/users/me");
    return { ok: true, id: u.id, site: u.site_id };
  } catch (err) {
    return { ok: false, reason: (err as Error).message };
  }
}

export const mercadoPagoSettings = { webhookSecret: Boolean(webhookSecret) };

export interface PreferenceInput {
  orderId: string;
  orderNumber: string;
  total: number;
  email: string;
  firstName: string;
  lastName: string;
  siteUrl: string;
  expiresInHours: number;
}

/** Crea la preferencia de pago y devuelve la URL a la que se lleva a la clienta. */
export async function createPreference(o: PreferenceInput): Promise<string> {
  const back = (estado: string) => `${o.siteUrl}/pedido/${encodeURIComponent(o.orderNumber)}?pago=${estado}`;
  const pref = await mp<{ id: string; init_point: string }>("/checkout/preferences", {
    method: "POST",
    headers: { "X-Idempotency-Key": `pref-${o.orderId}-${o.total}` },
    body: JSON.stringify({
      items: [{ id: o.orderNumber, title: `Pedido ${o.orderNumber} · Minerva`, quantity: 1, unit_price: o.total, currency_id: "CLP" }],
      payer: { email: o.email, name: o.firstName, surname: o.lastName },
      external_reference: o.orderId,
      back_urls: { success: back("ok"), pending: back("pendiente"), failure: back("error") },
      auto_return: "approved",
      notification_url: `${o.siteUrl}/api/payments/mercadopago/webhook`,
      statement_descriptor: "MINERVA",
      expires: true,
      expiration_date_to: new Date(Date.now() + o.expiresInHours * 3_600_000).toISOString(),
    }),
  });
  return pref.init_point;
}

export interface MpPayment {
  id: number;
  status: "approved" | "pending" | "in_process" | "authorized" | "rejected" | "cancelled" | "refunded" | "charged_back";
  external_reference: string | null;
  transaction_amount: number;
  currency_id: string;
}

export const getPayment = (id: string) => mp<MpPayment>(`/v1/payments/${encodeURIComponent(id)}`);

/**
 * Verifica la firma x-signature de Mercado Pago (si hay clave configurada).
 * Plantilla oficial: "id:{data.id};request-id:{x-request-id};ts:{ts};" con HMAC-SHA256.
 */
export function validWebhookSignature(signature: string | null, requestId: string | null, dataId: string): boolean {
  if (!webhookSecret) return true; // sin clave: igual es seguro porque el pago se confirma consultando la API
  if (!signature) return false;
  const parts = Object.fromEntries(signature.split(",").map((p) => p.trim().split("=") as [string, string]));
  if (!parts.ts || !parts.v1) return false;
  const manifest = `id:${dataId.toLowerCase()};${requestId ? `request-id:${requestId};` : ""}ts:${parts.ts};`;
  const expected = createHmac("sha256", webhookSecret).update(manifest).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(parts.v1);
  return a.length === b.length && timingSafeEqual(a, b);
}
