"use client";
import Link from "next/link";
import { Fragment, useEffect, useRef, useState } from "react";
import { useUI } from "@/lib/stores";
import { cn } from "@/lib/format";
import { waLink } from "@/lib/whatsapp";
import { Icon } from "@/components/ui/Icon";

type Message = { role: "user" | "assistant"; text: string };

const GREETING: Message = {
  role: "assistant",
  text: "¡Hola! Soy el asistente de Minerva ✨ Te ayudo con productos, personalización, envíos y pagos. ¿En qué te ayudo?",
};
const SUGGESTIONS = ["¿Cuánto demora mi pedido?", "¿Hacen envíos a regiones?", "¿Qué puedo personalizar?"];

/** Convierte las rutas /productos/... que menciona el bot en links. */
function RichText({ text, onNavigate }: { text: string; onNavigate: () => void }) {
  return text.split(/(\/productos\/[a-z0-9-]+)/g).map((part, i) =>
    /^\/productos\/[a-z0-9-]+$/.test(part) ? (
      <Link key={i} href={part} onClick={onNavigate} className="font-semibold underline underline-offset-2">
        Ver producto
      </Link>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    ),
  );
}

export function ChatWidget() {
  const overlay = useUI((s) => s.overlay);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([GREETING]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (overlay) setOpen(false);
  }, [overlay]);

  const send = async (text: string) => {
    const q = text.trim();
    if (!q || loading) return;
    const next = [...messages, { role: "user" as const, text: q }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // El saludo es local: no se envía al modelo.
        body: JSON.stringify({ messages: next.slice(1) }),
      });
      const data = (await res.json().catch(() => ({}))) as { reply?: string };
      const reply =
        data.reply ??
        (res.status === 429
          ? "Recibí muchas preguntas seguidas 😅 Espera un momento o escríbenos por WhatsApp."
          : "Ups, no pude responder ahora. Escríbenos por WhatsApp y te ayudamos al tiro.");
      setMessages((m) => [...m, { role: "assistant", text: reply }]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", text: "Parece que no hay conexión. Intenta de nuevo en un momento." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Cerrar asistente" : "Abrir asistente de ayuda"}
        aria-expanded={open}
        aria-controls="chat-panel"
        className={cn(
          "fixed bottom-20 right-4 z-40 grid size-13 place-items-center rounded-full bg-ink text-white shadow-[var(--shadow-soft)] transition-[transform,opacity] duration-500 ease-[var(--ease-out-expo)] hover:-translate-y-0.5 sm:bottom-24 sm:right-6",
          overlay && "pointer-events-none translate-y-4 opacity-0",
        )}
      >
        <Icon name={open ? "x" : "chat"} size={22} />
      </button>

      <section
        id="chat-panel"
        role="dialog"
        aria-label="Asistente de Minerva"
        className={cn(
          open ? "flex" : "hidden",
          "fixed bottom-36 right-4 z-40 h-[min(32rem,calc(100dvh-11rem))] w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-[1.75rem] bg-white shadow-[0_24px_60px_-20px_rgb(0_0_0/0.35)] sm:bottom-40 sm:right-6",
        )}
      >
        <header className="flex items-center gap-3 border-b border-line px-5 py-4">
          <span className="grid size-9 place-items-center rounded-full bg-paper-2">
            <Icon name="sparkle" size={18} />
          </span>
          <span className="flex-1">
            <span className="block font-semibold leading-tight">Asistente Minerva</span>
            <span className="block text-xs text-ink-soft">Respuestas automáticas · puede equivocarse</span>
          </span>
          <button type="button" onClick={() => setOpen(false)} aria-label="Cerrar" className="grid size-9 place-items-center rounded-full hover:bg-paper-2">
            <Icon name="x" size={18} />
          </button>
        </header>

        <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4" aria-live="polite">
          {messages.map((m, i) => (
            <p
              key={i}
              className={cn(
                "max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                m.role === "user" ? "ml-auto rounded-br-md bg-ink text-white" : "rounded-bl-md bg-paper-2",
              )}
            >
              {m.role === "assistant" ? <RichText text={m.text} onNavigate={() => setOpen(false)} /> : m.text}
            </p>
          ))}
          {loading && (
            <p className="flex w-16 justify-center gap-1 rounded-2xl rounded-bl-md bg-paper-2 py-3.5" aria-label="Escribiendo">
              {[0, 150, 300].map((d) => (
                <span key={d} className="size-1.5 animate-bounce rounded-full bg-ink-soft" style={{ animationDelay: `${d}ms` }} />
              ))}
            </p>
          )}
          {messages.length === 1 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {SUGGESTIONS.map((s) => (
                <button key={s} type="button" onClick={() => send(s)} className="rounded-full border border-line px-3 py-1.5 text-xs hover:border-ink/40">
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="flex items-center gap-2 border-t border-line p-3"
        >
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            maxLength={1000}
            placeholder="Escribe tu pregunta…"
            aria-label="Tu pregunta"
            className="field h-11 flex-1 rounded-full"
          />
          <button type="submit" disabled={loading || !input.trim()} aria-label="Enviar" className="btn btn-primary size-11 shrink-0 rounded-full p-0 disabled:opacity-40">
            <Icon name="send" size={18} />
          </button>
        </form>
        <a href={waLink()} target="_blank" rel="noopener noreferrer" className="pb-3 text-center text-xs text-ink-soft underline-offset-2 hover:underline">
          ¿Prefieres hablar con una persona? Escríbenos por WhatsApp
        </a>
      </section>
    </>
  );
}
