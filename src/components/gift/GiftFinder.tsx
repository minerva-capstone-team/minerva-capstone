"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { Product } from "@/lib/types";
import { BUDGETS, pickGifts, RECIPIENTS, type Budget, type Recipient } from "@/lib/gift-finder";
import { cn, formatCLP } from "@/lib/format";
import { ProductImage } from "@/components/product/ProductImage";
import { Icon, WhatsAppIcon } from "@/components/ui/Icon";
import { waLink } from "@/lib/whatsapp";

/** Tres preguntas → regalos reales del catálogo, con stock y precio. */
export function GiftFinder({ products }: { products: Product[] }) {
  const [who, setWho] = useState<Recipient | null>(null);
  const [budget, setBudget] = useState<Budget | null>(null);
  const picks = useMemo(() => (who && budget ? pickGifts(products, who, budget) : null), [products, who, budget]);
  const step = !who ? 1 : !budget ? 2 : 3;

  const reset = () => {
    setWho(null);
    setBudget(null);
  };

  return (
    <div className="mx-auto mt-10 max-w-3xl">
      <ol className="mb-6 flex items-center gap-2 text-sm text-ink-soft" aria-label="Progreso">
        {["¿Para quién?", "¿Cuánto quieres gastar?", "Tus ideas"].map((label, i) => (
          <li key={label} className={cn("flex items-center gap-2", step === i + 1 && "font-semibold text-ink")} aria-current={step === i + 1 ? "step" : undefined}>
            <span className={cn("grid size-6 place-items-center rounded-full text-xs", step > i + 1 ? "bg-ink text-white" : step === i + 1 ? "border-2 border-ink" : "border border-line")}>
              {step > i + 1 ? <Icon name="check" size={13} strokeWidth={2.6} /> : i + 1}
            </span>
            <span className="hidden sm:inline">{label}</span>
            {i < 2 && <span aria-hidden className="mx-1 h-px w-6 bg-line" />}
          </li>
        ))}
      </ol>

      <div className="rounded-[2rem] bg-white p-6 shadow-[var(--shadow-soft)] sm:p-8">
        {step === 1 && (
          <fieldset>
            <legend className="display text-2xl">¿Para quién es el regalo?</legend>
            <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup">
              {RECIPIENTS.map((r) => (
                <button key={r.id} type="button" role="radio" aria-checked={false} className="chip justify-center py-3" onClick={() => setWho(r)}>
                  {r.label}
                </button>
              ))}
            </div>
          </fieldset>
        )}

        {step === 2 && who && (
          <fieldset>
            <legend className="display text-2xl">¿Cuánto quieres gastar?</legend>
            <p className="mt-1 text-sm text-ink-soft">Regalo para: {who.label}</p>
            <div className="mt-5 grid grid-cols-2 gap-2" role="radiogroup">
              {BUDGETS.map((b) => (
                <button key={b.id} type="button" role="radio" aria-checked={false} className="chip justify-center py-3" onClick={() => setBudget(b)}>
                  {b.label}
                </button>
              ))}
            </div>
            <button type="button" className="mt-4 text-sm text-ink-soft underline underline-offset-2" onClick={reset}>
              ← Cambiar la persona
            </button>
          </fieldset>
        )}

        {step === 3 && who && budget && picks && (
          <div aria-live="polite">
            <h2 className="display text-2xl">
              {picks.length ? `Ideas para ${who.id === "yo" ? "ti" : who.label.toLowerCase()}` : "No encontramos algo con ese presupuesto"}
            </h2>
            <p className="mt-1 text-sm text-ink-soft">
              {budget.label} · solo productos con stock
            </p>
            {picks.length > 0 ? (
              <ul className="mt-6 grid gap-4 sm:grid-cols-2">
                {picks.map(({ product, reason }) => (
                  <li key={product.id} className="overflow-hidden rounded-3xl border border-line">
                    <Link href={`/productos/${product.slug}`} className="block">
                      <div className="relative aspect-[4/3] bg-paper-2">
                        <ProductImage src={product.images[0]?.image_url} art={product.placeholder_art} alt={product.name} sizes="(min-width: 640px) 320px, 100vw" />
                      </div>
                      <div className="p-4">
                        <p className="font-semibold leading-snug">{product.name}</p>
                        <p className="mt-1 text-sm tabular-nums">{formatCLP(product.price)}</p>
                        <p className="mt-2 text-sm text-ink-soft">{reason}</p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-6 text-ink-soft">Prueba con un presupuesto mayor o cuéntanos qué buscas y te ayudamos a armar algo.</p>
            )}
            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
              <button type="button" className="btn btn-ghost flex-1" onClick={reset}>
                Empezar de nuevo
              </button>
              <a
                className="btn btn-wa flex-1"
                href={waLink(`Hola Minerva 👋 Busco un regalo para ${who.label.toLowerCase()} (${budget.label.toLowerCase()}). ¿Me ayudan a elegir?`)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <WhatsAppIcon /> Pedir ayuda por WhatsApp
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
