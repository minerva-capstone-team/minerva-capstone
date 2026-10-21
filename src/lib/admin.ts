"use client";
import type { NotifyKind } from "./order-notify";
import { getBrowserSupabase } from "./supabase/client";
import { PRODUCT_BUCKET } from "./supabase/config";

export function adminDb() {
  const sb = getBrowserSupabase();
  if (!sb) throw new Error("Supabase no está configurado.");
  return sb;
}

/** Pide al servidor refrescar las páginas públicas (verifica que seas admin). */
export async function revalidateStore() {
  const { data } = await adminDb().auth.getSession();
  const token = data.session?.access_token;
  if (!token) return;
  await fetch("/api/revalidate", { method: "POST", headers: { Authorization: `Bearer ${token}` } }).catch(() => undefined);
}

/** Pide al servidor enviar por email el aviso de estado al cliente (arma el mensaje con el estado real del pedido). */
export async function notifyCustomer(orderId: string, kind: NotifyKind): Promise<{ sent: boolean; reason?: string }> {
  const { data } = await adminDb().auth.getSession();
  const token = data.session?.access_token;
  if (!token) return { sent: false, reason: "no session" };
  try {
    const res = await fetch("/api/notify-status", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ orderId, kind }),
    });
    const body = (await res.json().catch(() => ({}))) as { sent?: boolean; reason?: string };
    return res.ok ? { sent: Boolean(body.sent), reason: body.reason } : { sent: false, reason: "error" };
  } catch {
    return { sent: false, reason: "error" };
  }
}

export type SignupDecision = { ok: true; couponCode?: string; newAccount?: boolean } | { ok: false; error: string };

/** Acepta o rechaza una solicitud de cuenta de Instagram (el servidor crea la cuenta, el cupón y envía el correo). */
export async function decideSignup(id: string, action: "approve" | "reject"): Promise<SignupDecision> {
  const { data } = await adminDb().auth.getSession();
  const token = data.session?.access_token;
  if (!token) return { ok: false, error: "Tu sesión expiró. Vuelve a entrar." };
  try {
    const res = await fetch("/api/admin/instagram-signups", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id, action }),
    });
    const body = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; couponCode?: string; newAccount?: boolean };
    if (res.ok && body.ok) return { ok: true, couponCode: body.couponCode, newAccount: body.newAccount };
    return { ok: false, error: body.error && body.error !== "forbidden" ? body.error : "No se pudo completar la acción." };
  } catch {
    return { ok: false, error: "Sin conexión con el servidor." };
  }
}

export async function uploadPublicImage(file: File, folder: string) {
  if (!file.type.startsWith("image/")) throw new Error("El archivo debe ser una imagen.");
  if (file.size > 5 * 1024 * 1024) throw new Error("La imagen supera los 5 MB. Redúcela antes de subirla.");
  const sb = adminDb();
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await sb.storage.from(PRODUCT_BUCKET).upload(path, file, { cacheControl: "31536000", contentType: file.type });
  if (error) throw new Error(`No se pudo subir la imagen: ${error.message}`);
  const { data } = sb.storage.from(PRODUCT_BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, path };
}

export async function removePublicImage(path: string | null) {
  if (!path) return;
  await adminDb().storage.from(PRODUCT_BUCKET).remove([path]);
}

export const errorMessage = (e: unknown) => {
  const msg = e instanceof Error ? e.message : typeof e === "object" && e && "message" in e ? String((e as { message: unknown }).message) : "Error inesperado";
  if (/duplicate key.*slug/i.test(msg)) return "Ya existe otro registro con ese slug (URL). Cambia el nombre o el slug.";
  if (/row-level security/i.test(msg)) return "No tienes permisos para esta acción.";
  return msg;
};
