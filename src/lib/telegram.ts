import "server-only";

/**
 * Bot de Telegram para quien administra la tienda: avisa de pedidos y solicitudes de cuenta
 * nuevas y responde comandos (/resumen, /pedidos, /cuentas, /stock). No habla con clientes.
 *
 * Variables (solo servidor):
 *  - TELEGRAM_BOT_TOKEN       token que entrega @BotFather
 *  - TELEGRAM_WEBHOOK_SECRET  clave inventada; Telegram la manda en cada aviso para probar que es él
 *  - TELEGRAM_ADMIN_CHAT_IDS  ids de chat autorizados, separados por coma (el bot te dice el tuyo con /start)
 */
const token = process.env.TELEGRAM_BOT_TOKEN ?? "";
export const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET ?? "";
/** Permite apuntar a un servidor falso en pruebas locales. */
const api = process.env.TELEGRAM_API_URL || "https://api.telegram.org";

export const adminChatIds = (process.env.TELEGRAM_ADMIN_CHAT_IDS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

export const isTelegramConfigured = Boolean(token && webhookSecret);
export const isTelegramAdmin = (chatId: number | string) => adminChatIds.includes(String(chatId));

export interface InlineButton {
  text: string;
  callback_data?: string;
  url?: string;
}

export const esc = (s: string | number | null | undefined) =>
  String(s ?? "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!);

async function call(method: string, body: Record<string, unknown>) {
  try {
    const res = await fetch(`${api}/bot${token}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) console.error(`[telegram] ${method} falló (${res.status}):`, (await res.text()).slice(0, 200));
    return res.ok;
  } catch (err) {
    console.error(`[telegram] ${method} error de red:`, (err as Error).message);
    return false;
  }
}

export function sendMessage(chatId: number | string, html: string, buttons?: InlineButton[][]) {
  return call("sendMessage", {
    chat_id: chatId,
    text: html.slice(0, 4000),
    parse_mode: "HTML",
    disable_web_page_preview: true,
    ...(buttons ? { reply_markup: { inline_keyboard: buttons } } : {}),
  });
}

export function editMessage(chatId: number | string, messageId: number, html: string) {
  return call("editMessageText", { chat_id: chatId, message_id: messageId, text: html.slice(0, 4000), parse_mode: "HTML", disable_web_page_preview: true });
}

export function answerCallback(callbackId: string, text: string) {
  return call("answerCallbackQuery", { callback_query_id: callbackId, text: text.slice(0, 190) });
}

/** Manda un aviso a todos los chats autorizados. Nunca lanza error: un fallo de Telegram no debe frenar un pedido. */
export async function notifyAdmins(html: string, buttons?: InlineButton[][]) {
  if (!isTelegramConfigured || !adminChatIds.length) return;
  await Promise.all(adminChatIds.map((id) => sendMessage(id, html, buttons)));
}

/** Mensaje + botones de una solicitud de cuenta por revisar (se usa en el aviso y en /cuentas). */
export function signupCard(s: { id: string; email: string; product: string | null }): { html: string; buttons: InlineButton[][] } {
  return {
    html: `🆕 <b>Solicitud de cuenta de Instagram</b>\n${esc(s.email)}\nLe interesaba: ${esc(s.product ?? "toda la tienda")}`,
    buttons: [
      [
        { text: "✅ Aceptar", callback_data: `ap:${s.id}` },
        { text: "❌ Rechazar", callback_data: `rj:${s.id}` },
      ],
    ],
  };
}

