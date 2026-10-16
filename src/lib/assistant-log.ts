import "server-only";
import { createHash } from "node:crypto";
import { getServiceSupabase } from "./supabase/service";

const RETENTION_DAYS = 90;

/** Identificador anónimo y estable de quien pregunta (no se guarda la cuenta de Instagram ni la IP). */
export function anonymize(senderKey: string) {
  const salt = process.env.ASSISTANT_LOG_SALT || process.env.INSTAGRAM_APP_SECRET || "minerva";
  return createHash("sha256").update(`${salt}:${senderKey}`).digest("hex").slice(0, 32);
}

/** Slugs de los productos que el asistente enlazó en su respuesta. */
export function linkedProducts(reply: string | null) {
  const slugs = (reply ?? "").match(/\/productos\/([a-z0-9-]+)/g) ?? [];
  return [...new Set(slugs.map((s) => s.split("/").pop()!))].slice(0, 10);
}

/**
 * Guarda la pregunta y la respuesta para el panel "Lo que preguntan". Nunca interrumpe la
 * respuesta al cliente: si falla o no hay clave de servicio, solo se registra en los logs.
 */
export async function logAssistantMessage(entry: {
  channel: "instagram" | "web";
  senderKey: string;
  question: string;
  reply: string | null;
  fallback: boolean;
  latencyMs: number;
}) {
  const sb = getServiceSupabase();
  if (!sb) return;
  try {
    const { error } = await sb.from("assistant_messages").insert({
      channel: entry.channel,
      sender_hash: anonymize(entry.senderKey),
      question: entry.question.slice(0, 1000),
      reply: entry.reply?.slice(0, 2000) ?? null,
      products: linkedProducts(entry.reply),
      fallback: entry.fallback,
      latency_ms: Math.round(entry.latencyMs),
    });
    if (error) console.error("[assistant-log]", error.message);
    // Limpieza ocasional de lo que supera el plazo de conservación.
    if (Math.random() < 0.05) {
      await sb.from("assistant_messages").delete().lt("created_at", new Date(Date.now() - RETENTION_DAYS * 86_400_000).toISOString());
    }
  } catch (err) {
    console.error("[assistant-log]", (err as Error).message);
  }
}
