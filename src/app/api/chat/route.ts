import { after, NextResponse, type NextRequest } from "next/server";
import { askGemini, isChatConfigured, type ChatMessage } from "@/lib/chat";
import { logAssistantMessage } from "@/lib/assistant-log";

const MAX_MESSAGES = 20;
const MAX_CHARS = 1000;

// Límite simple por IP (en memoria: se reinicia con cada instancia del servidor).
const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS = 30;
const hits = new Map<string, number[]>();

function rateLimited(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > MAX_REQUESTS;
}

/** Chatbot de ayuda: la API key de Gemini solo vive en el servidor. */
export async function POST(req: NextRequest) {
  if (!isChatConfigured) return NextResponse.json({ error: "not configured" }, { status: 503 });
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (rateLimited(ip)) return NextResponse.json({ error: "rate limited" }, { status: 429 });

  const body = (await req.json().catch(() => null)) as { messages?: ChatMessage[] } | null;
  const messages = (Array.isArray(body?.messages) ? body.messages : [])
    .filter((m) => (m?.role === "user" || m?.role === "assistant") && typeof m.text === "string" && m.text.trim())
    .slice(-MAX_MESSAGES)
    .map((m) => ({ role: m.role, text: m.text.slice(0, MAX_CHARS) }));
  if (messages.at(-1)?.role !== "user") return NextResponse.json({ error: "bad request" }, { status: 400 });

  const question = messages.at(-1)!.text;
  const started = Date.now();
  try {
    const reply = await askGemini(messages);
    after(() => logAssistantMessage({ channel: "web", senderKey: ip, question, reply, fallback: false, latencyMs: Date.now() - started }));
    return NextResponse.json({ reply });
  } catch (err) {
    console.error("[chat]", err);
    after(() => logAssistantMessage({ channel: "web", senderKey: ip, question, reply: null, fallback: true, latencyMs: Date.now() - started }));
    return NextResponse.json({ error: "upstream" }, { status: 502 });
  }
}
