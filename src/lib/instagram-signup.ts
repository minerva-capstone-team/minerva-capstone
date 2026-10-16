import "server-only";
import { randomInt } from "node:crypto";
import { anonymize } from "./assistant-log";
import { canEmailCustomers, sendWelcomeEmail } from "./email";
import { getServiceSupabase, isServiceConfigured } from "./supabase/service";
import { site } from "./site";

/**
 * Cuenta + cupón desde un DM de Instagram:
 *  1. La persona escribe su correo → se le pide confirmación (consentimiento).
 *  2. Responde "sí" → se crea la cuenta con contraseña temporal (o se usa la que ya tenía),
 *     un cupón personal del 10 % por 30 días (del producto que consultó, si hubo uno)
 *     y se le envía TODO por correo. La contraseña nunca va por el DM.
 * Una vez por cuenta de Instagram y una vez por correo.
 */

export const SIGNUP_PERCENT = 10;
const COUPON_DAYS = 30;
const PENDING_HOURS = 24;
/** Ventana para recordar qué producto consultó la persona. */
const INTEREST_DAYS = 7;

const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;
const YES_RE = /^\s*(s[ií]+|si po|sip|dale|ya|ok(ey)?|acepto|bueno|claro|de una)\b/i;
const NO_RE = /^\s*(no|nop|mejor no)\b/i;
// Sin 0/O ni 1/I/L para que se lea bien.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const LOWER = "abcdefghjkmnpqrstuvwxyz";

const pick = (chars: string, n: number) => Array.from({ length: n }, () => chars[randomInt(chars.length)]).join("");

/** Contraseña temporal legible: Minerva-ab3K-9pQx */
const tempPassword = () => `Minerva-${pick(LOWER + "23456789", 4)}${pick(ALPHABET, 1)}-${pick(ALPHABET + LOWER, 4)}`;

function couponCode(slug: string | null) {
  const prefix = slug ? slug.split("-")[0].toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8) : "";
  return `${prefix || "IG"}-${pick(ALPHABET, 5)}`;
}

export const canRunSignup = () => isServiceConfigured && canEmailCustomers;

/** Producto que la persona consultó hace poco (según los enlaces que le dio el asistente). */
async function recentInterest(senderHash: string) {
  const sb = getServiceSupabase()!;
  const { data } = await sb
    .from("assistant_messages")
    .select("products")
    .eq("sender_hash", senderHash)
    .gte("created_at", new Date(Date.now() - INTEREST_DAYS * 86_400_000).toISOString())
    .order("created_at", { ascending: false })
    .limit(20);
  const slug = (data ?? []).flatMap((r) => (r.products as string[] | null) ?? [])[0];
  if (!slug) return null;
  const { data: p } = await sb.from("products").select("id, name, slug").eq("slug", slug).eq("active", true).maybeSingle();
  return (p as { id: string; name: string; slug: string } | null) ?? null;
}

async function productById(id: string | null) {
  if (!id) return null;
  const { data } = await getServiceSupabase()!.from("products").select("id, name, slug").eq("id", id).maybeSingle();
  return (data as { id: string; name: string; slug: string } | null) ?? null;
}

/**
 * Devuelve la respuesta para el DM si el mensaje es parte del registro, o null para que
 * responda el asistente normal.
 */
export async function handleSignupMessage(sender: string, text: string): Promise<string | null> {
  if (!canRunSignup()) return null;
  const sb = getServiceSupabase()!;
  const senderHash = anonymize(sender);
  const email = text.match(EMAIL_RE)?.[0]?.toLowerCase().slice(0, 160);

  const { data: row } = await sb.from("instagram_signups").select("*").eq("sender_hash", senderHash).maybeSingle();

  if (row?.status === "creada") {
    // Ya tiene su cupón: solo respondemos si vuelve a mandar un correo.
    return email ? `Ya te enviamos tu cupón al correo ${row.email} 💛 Si no lo encuentras, revisa spam o promociones.` : null;
  }

  if (email) {
    const { data: used } = await sb.from("instagram_signups").select("id").eq("email", email).eq("status", "creada").maybeSingle();
    if (used) return "Ese correo ya recibió su cupón de bienvenida 💛 Si no lo encuentras, revisa spam o promociones.";
    const product = await recentInterest(senderHash);
    const { error } = await sb
      .from("instagram_signups")
      .upsert({ sender_hash: senderHash, email, product_id: product?.id ?? null, status: "pendiente", created_at: new Date().toISOString() }, { onConflict: "sender_hash" });
    if (error) {
      console.error("[ig-signup] no se pudo guardar el correo:", error.message);
      return null;
    }
    const gift = product ? `un ${SIGNUP_PERCENT}% de descuento en ${product.name}` : `un ${SIGNUP_PERCENT}% de descuento en tu primera compra`;
    return `¡Gracias! ¿Quieres que te creemos una cuenta en ${site.name} con ${email}? Te llegará al correo tu acceso y ${gift} (válido ${COUPON_DAYS} días). Responde SÍ para confirmar.`;
  }

  if (row?.status !== "pendiente") return null;
  if (Date.now() - new Date(row.created_at).getTime() > PENDING_HOURS * 3_600_000) return null;
  if (text.length > 40) return null;
  if (NO_RE.test(text)) {
    await sb.from("instagram_signups").delete().eq("id", row.id);
    return "¡Listo, no creamos nada! Si cambias de opinión, mándanos tu correo cuando quieras.";
  }
  if (!YES_RE.test(text)) return null;

  return createAccount(row.id, row.email, await productById(row.product_id));
}

async function createAccount(signupId: string, email: string, product: { id: string; name: string; slug: string } | null) {
  const sb = getServiceSupabase()!;
  const expiresAt = new Date(Date.now() + COUPON_DAYS * 86_400_000);
  const fail = "Uy, no pudimos crear tu cuenta ahora 🙈 Inténtalo de nuevo en un rato respondiendo SÍ, o escríbenos por WhatsApp.";

  // 1) Cupón personal (código único: reintenta si choca).
  let code = "";
  for (let i = 0; i < 4 && !code; i++) {
    const candidate = couponCode(product?.slug ?? null);
    const { error } = await sb.from("coupons").insert({
      code: candidate,
      kind: "percent",
      value: SIGNUP_PERCENT,
      max_uses: 1,
      expires_at: expiresAt.toISOString(),
      email,
      product_id: product?.id ?? null,
      source: "instagram",
    });
    if (!error) code = candidate;
    else if (!/duplicate|unique/i.test(error.message)) {
      console.error("[ig-signup] cupón:", error.message);
      return fail;
    }
  }
  if (!code) return fail;

  // 2) Cuenta. Si el correo ya existe no tocamos su contraseña.
  const password = tempPassword();
  let newUserId: string | null = null;
  const { data: created, error: userErr } = await sb.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { must_change_password: true, source: "instagram" },
  });
  if (userErr && !/already|exists|registered/i.test(userErr.message)) {
    console.error("[ig-signup] cuenta:", userErr.message);
    await sb.from("coupons").delete().eq("code", code);
    return fail;
  }
  if (created?.user) newUserId = created.user.id;

  // 3) Correo con el acceso y el cupón.
  const { error: mailErr } = await sendWelcomeEmail(email, {
    password: newUserId ? password : null,
    couponCode: code,
    percent: SIGNUP_PERCENT,
    productName: product?.name ?? null,
    expiresAt,
  });
  if (mailErr) {
    console.error("[ig-signup] correo:", mailErr);
    await sb.from("coupons").delete().eq("code", code);
    if (newUserId) await sb.auth.admin.deleteUser(newUserId);
    return "No pudimos enviarte el correo 🙈 Revisa que esté bien escrito y mándalo de nuevo.";
  }

  await sb
    .from("instagram_signups")
    .update({ status: "creada", coupon_code: code, new_account: Boolean(newUserId), confirmed_at: new Date().toISOString() })
    .eq("id", signupId);
  console.info(`[ig-signup] cuenta ${newUserId ? "nueva" : "existente"} + cupón ${code}`);

  const where = product ? ` para ${product.name}` : "";
  return newUserId
    ? `¡Listo! 🎉 Te enviamos a ${email} tu contraseña temporal y tu cupón ${code}${where}. Entra en ${site.url}/cuenta y el descuento se aplica solo al pagar. (Si no ves el correo, revisa spam.)`
    : `¡Listo! 🎉 Ya tenías cuenta con ${email}, así que dejamos ahí tu cupón ${code}${where}. Te enviamos los detalles por correo.`;
}
