"use client";
import Link from "next/link";
import { useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { cn } from "@/lib/format";
import { Icon } from "@/components/ui/Icon";

interface Gift {
  message: string;
  from: string | null;
  items: string[];
}

export function GiftReveal({ code }: { code: string }) {
  const [state, setState] = useState<"closed" | "loading" | "open" | "missing" | "error">("closed");
  const [gift, setGift] = useState<Gift | null>(null);

  const open = async () => {
    const sb = getBrowserSupabase();
    if (!sb) return setState("error");
    setState("loading");
    const { data, error } = await sb.rpc("open_gift", { p_code: code });
    if (error) return setState("error");
    if (!data) return setState("missing");
    setGift(data as Gift);
    setState("open");
  };

  if (state === "missing" || state === "error") {
    return (
      <div className="mx-auto max-w-md rounded-[2rem] bg-white p-10 text-center shadow-[var(--shadow-soft)]">
        <h1 className="display text-2xl">{state === "missing" ? "No encontramos este mensaje" : "No pudimos abrir el mensaje"}</h1>
        <p className="mt-2 text-ink-soft">{state === "missing" ? "Revisa que el código de la tarjeta esté bien escrito." : "Inténtalo de nuevo en un momento."}</p>
        <button type="button" className="btn btn-ghost mt-6" onClick={() => setState("closed")}>
          Volver a intentar
        </button>
      </div>
    );
  }

  if (state !== "open" || !gift) {
    return (
      <div className="mx-auto max-w-md text-center">
        <p className="eyebrow justify-center">Un regalo de Minerva</p>
        <h1 className="display mt-4 text-[clamp(2.2rem,6vw,3.4rem)] leading-tight">
          Tienes un <span className="serif-accent text-gradient">mensaje secreto</span>
        </h1>
        <button
          type="button"
          onClick={open}
          disabled={state === "loading"}
          aria-label="Abrir el mensaje"
          className="group relative mx-auto mt-10 block aspect-[4/3] w-full max-w-sm rounded-[1.75rem] bg-white shadow-[0_24px_60px_-24px_rgb(0_0_0/0.35)] transition-transform duration-500 ease-[var(--ease-out-expo)] hover:-translate-y-1 motion-reduce:transition-none"
        >
          <svg viewBox="0 0 400 300" className="absolute inset-0 h-full w-full" aria-hidden>
            <path d="M24 70 L200 190 L376 70" fill="none" stroke="#e6ddd2" strokeWidth="3" />
            <path d="M24 270 L160 160 M376 270 L240 160" fill="none" stroke="#e6ddd2" strokeWidth="3" />
          </svg>
          <span className="bg-gradient-minerva absolute left-1/2 top-[52%] grid size-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full text-white shadow-lg transition-transform group-hover:scale-105">
            {state === "loading" ? <span className="size-5 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : <Icon name="heart" size={26} />}
          </span>
        </button>
        <p className="mt-6 text-ink-soft">Toca el sobre para abrirlo.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl animate-[fade-up_0.8s_var(--ease-out-expo)] motion-reduce:animate-none">
      <article className="relative overflow-hidden rounded-[2rem] bg-white px-7 py-10 text-center shadow-[0_24px_60px_-24px_rgb(0_0_0/0.35)] sm:px-12">
        <div className="bg-gradient-minerva absolute inset-x-0 top-0 h-1.5" />
        <p className="eyebrow justify-center">Para ti</p>
        <p className="serif-accent mt-6 whitespace-pre-line text-[clamp(1.5rem,4.5vw,2.1rem)] leading-snug text-ink">“{gift.message}”</p>
        {gift.from && <p className="mt-6 text-lg font-semibold text-ink-2">— {gift.from}</p>}
      </article>
      {gift.items.length > 0 && (
        <p className="mt-6 text-center text-sm text-ink-soft">
          Tu regalo: {gift.items.join(", ")}. Hecho con cariño en Minerva.
        </p>
      )}
      <div className={cn("mt-8 flex justify-center")}>
        <Link href="/" className="btn btn-ghost">
          Conoce Minerva
        </Link>
      </div>
    </div>
  );
}
