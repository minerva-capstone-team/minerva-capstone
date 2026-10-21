import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { answerCallback, editMessage, isTelegramAdmin, isTelegramConfigured, sendMessage, webhookSecret } from "@/lib/telegram";
import { handleCommand, handleSignupDecision } from "@/lib/telegram-commands";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface Update {
  message?: { chat?: { id: number; type?: string }; text?: string };
  callback_query?: { id: string; data?: string; message?: { message_id: number; chat: { id: number } } };
}

const safeEqual = (a: string, b: string) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

/**
 * Webhook del bot de Telegram. Telegram firma cada aviso con la clave secreta que se registró en
 * setWebhook (cabecera X-Telegram-Bot-Api-Secret-Token); sin ella se rechaza. Además, solo los
 * chats listados en TELEGRAM_ADMIN_CHAT_IDS pueden ver datos o aprobar cuentas.
 */
export async function POST(req: NextRequest) {
  if (!isTelegramConfigured) return NextResponse.json({ error: "not configured" }, { status: 503 });
  const header = req.headers.get("x-telegram-bot-api-secret-token") ?? "";
  if (!safeEqual(header, webhookSecret)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const update = (await req.json().catch(() => ({}))) as Update;
  try {
    if (update.callback_query) {
      const cb = update.callback_query;
      const chatId = cb.message?.chat.id;
      if (!chatId || !isTelegramAdmin(chatId)) {
        await answerCallback(cb.id, "No tienes permiso.");
        return NextResponse.json({ ok: true });
      }
      const [action, id] = (cb.data ?? "").split(":");
      if ((action === "ap" || action === "rj") && id && UUID.test(id)) {
        await answerCallback(cb.id, action === "ap" ? "Procesando…" : "Rechazando…");
        const text = await handleSignupDecision(action, id);
        if (cb.message) await editMessage(chatId, cb.message.message_id, text);
      } else {
        await answerCallback(cb.id, "Acción no reconocida.");
      }
      return NextResponse.json({ ok: true });
    }

    const msg = update.message;
    const chatId = msg?.chat?.id;
    if (!msg || !chatId || msg.chat?.type !== "private") return NextResponse.json({ ok: true });
    const command = /^\/(\w+)/.exec(msg.text ?? "")?.[1]?.toLowerCase();

    // Cualquiera puede pedir su número de chat para que se lo agreguen a la lista; nada más.
    if (command === "start" || command === "id") {
      await sendMessage(chatId, isTelegramAdmin(chatId) ? "Hola 👋 Estás autorizado. Escribe /ayuda para ver los comandos." : `Hola 👋 Este bot es solo para el equipo de Minerva.\nSi eres parte del equipo, pásale este número a quien administra el sitio: <code>${chatId}</code>`);
      return NextResponse.json({ ok: true });
    }
    if (!isTelegramAdmin(chatId)) return NextResponse.json({ ok: true });
    await handleCommand(chatId, command ?? "ayuda");
  } catch (err) {
    console.error("[telegram] error procesando el aviso:", err);
  }
  // Siempre 200: si no, Telegram reintenta el mismo aviso una y otra vez.
  return NextResponse.json({ ok: true });
}
