import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { askGemini, type ChatMessage } from "./chat";
import { site } from "./site";

const appSecret = process.env.INSTAGRAM_APP_SECRET ?? "";
const verifyToken = process.env.INSTAGRAM_VERIFY_TOKEN ?? "";
const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN ?? "";
/** Permite apuntar a un servidor falso en pruebas locales. */
const graph = process.env.INSTAGRAM_GRAPH_URL || "https://graph.instagram.com/v23.0";

export const isInstagramConfigured = Boolean(appSecret && verifyToken && accessToken);

const FALLBACK = `¡Hola! 👋 Ahora mismo no puedo responder por aquí. Escríbenos por WhatsApp al ${site.whatsappDisplay} y te ayudamos al tiro.`;
const ATTACHMENT_NOTICE = `Por aquí solo puedo leer mensajes de texto 🙈 Cuéntame en palabras qué necesitas, o escríbenos por WhatsApp al ${site.whatsappDisplay} para enviar fotos o diseños.`;

/* --------------------------------- Seguridad -------------------------------- */

const safeEqual = (a: string, b: string) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

/** Meta firma cada aviso con HMAC-SHA256 del cuerpo usando el App Secret. */
export function validSignature(rawBody: string, header: string | null) {
  if (!appSecret || !header?.startsWith("sha256=")) return false;
  const expected = createHmac("sha256", appSecret).update(rawBody).digest("hex");
  return safeEqual(header.slice(7), expected);
}

export const validVerifyToken = (token: string | null) => Boolean(verifyToken && token && safeEqual(token, verifyToken));

/* ------------------------------- Enviar mensaje ------------------------------ */

/** Instagram acepta hasta 1000 bytes por mensaje. */
function clip(text: string, maxBytes = 950) {
  if (Buffer.byteLength(text) <= maxBytes) return text;
  let out = text;
  while (Buffer.byteLength(out) > maxBytes - 3) out = out.slice(0, -10);
  return `${out.trimEnd()}…`;
}

export async function sendDm(recipientId: string, text: string) {
  try {
    const res = await fetch(`${graph}/me/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ recipient: { id: recipientId }, message: { text: clip(text) } }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) console.error(`[instagram] no se pudo enviar el mensaje (${res.status}):`, (await res.text()).slice(0, 300));
    return res.ok;
  } catch (err) {
    console.error("[instagram] error de red al enviar el mensaje:", (err as Error).message);
    return false;
  }
}

/** Plazo máximo para que el bot piense; pasado ese tiempo se responde el mensaje de respaldo (la función tiene 60 s). */
const REPLY_DEADLINE_MS = Number(process.env.INSTAGRAM_REPLY_DEADLINE_MS) || 40_000;

function withDeadline<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`sin respuesta en ${ms / 1000}s`)), ms);
  });
  return Promise.race([promise, deadline]).finally(() => clearTimeout(timer));
}

/* ------------------------- Memoria corta (en memoria) ------------------------ */
// En un servidor "serverless" cada instancia tiene su propia memoria: si la conversación cae en otra
// instancia, el bot simplemente responde solo con el último mensaje. No se guarda nada en disco.

const HISTORY_TTL = 24 * 60 * 60 * 1000;
const MAX_HISTORY = 8;
const history = new Map<string, { at: number; messages: ChatMessage[] }>();
const seenMids = new Map<string, number>();
const hits = new Map<string, number[]>();
const attachmentNoticeAt = new Map<string, number>();

const RATE_WINDOW = 60 * 60 * 1000;
const RATE_MAX = 20;

function rateLimited(sender: string) {
  const now = Date.now();
  const recent = (hits.get(sender) ?? []).filter((t) => now - t < RATE_WINDOW);
  recent.push(now);
  hits.set(sender, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > RATE_MAX;
}

function remember(sender: string, message: ChatMessage) {
  const now = Date.now();
  const entry = history.get(sender);
  const messages = entry && now - entry.at < HISTORY_TTL ? entry.messages : [];
  messages.push(message);
  history.set(sender, { at: now, messages: messages.slice(-MAX_HISTORY) });
  if (history.size > 500) for (const [k, v] of history) if (now - v.at > HISTORY_TTL) history.delete(k);
}

/** Meta puede reenviar el mismo aviso; así no se responde dos veces. */
function alreadySeen(mid: string | undefined) {
  if (!mid) return false;
  if (seenMids.has(mid)) return true;
  seenMids.set(mid, Date.now());
  if (seenMids.size > 2000) seenMids.clear();
  return false;
}

/* ---------------------------------- Avisos ---------------------------------- */

export interface IgMessagingEvent {
  sender?: { id?: string };
  message?: { mid?: string; text?: string; is_echo?: boolean; is_self?: boolean };
}
export interface IgPayload {
  object?: string;
  entry?: { id?: string; messaging?: IgMessagingEvent[] }[];
}

async function handleEvent(accountId: string | undefined, ev: IgMessagingEvent) {
  const sender = ev.sender?.id;
  const msg = ev.message;
  // Ignora los mensajes que envía la propia cuenta (si no, el bot se respondería a sí mismo).
  if (!sender || !msg || msg.is_echo || msg.is_self || sender === accountId) return;
  if (alreadySeen(msg.mid)) return;

  const text = msg.text?.trim();
  if (!text) {
    // Foto, sticker, reel compartido…: avisa como máximo una vez por hora.
    const last = attachmentNoticeAt.get(sender) ?? 0;
    if (Date.now() - last > RATE_WINDOW) {
      attachmentNoticeAt.set(sender, Date.now());
      await sendDm(sender, ATTACHMENT_NOTICE);
    }
    return;
  }
  if (rateLimited(sender)) {
    console.warn(`[instagram] ${sender}: demasiados mensajes en la última hora, se ignora.`);
    return;
  }

  remember(sender, { role: "user", text: text.slice(0, 1000) });
  let reply = FALLBACK;
  const started = Date.now();
  try {
    reply = await withDeadline(askGemini(history.get(sender)!.messages, "instagram"), REPLY_DEADLINE_MS);
    remember(sender, { role: "assistant", text: reply });
    console.info(`[instagram] respuesta generada en ${Date.now() - started} ms`);
  } catch (err) {
    console.error(`[instagram] Gemini falló tras ${Date.now() - started} ms:`, err);
  }
  await sendDm(sender, reply);
}

export async function handleInstagramPayload(payload: IgPayload) {
  for (const entry of payload.entry ?? []) {
    for (const ev of entry.messaging ?? []) {
      try {
        await handleEvent(entry.id, ev);
      } catch (err) {
        console.error("[instagram] error procesando un mensaje:", err);
      }
    }
  }
}
