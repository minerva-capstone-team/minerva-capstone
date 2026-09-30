"use client";
import { useEffect, useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getLocalOrder } from "@/lib/orders";
import { cn } from "@/lib/format";
import { orderStatusLabel } from "@/lib/order-status";
import { normalizeOrderNumber, PAKET_TRACKING_URL, TRACKING_STEPS, trackingRank, type TrackedOrder } from "@/lib/tracking";
import { waLink } from "@/lib/whatsapp";
import { Icon, WhatsAppIcon } from "@/components/ui/Icon";

function Timeline({ order }: { order: TrackedOrder }) {
  const rank = trackingRank(order);
  return (
    <ol className="mt-6 space-y-0">
      {TRACKING_STEPS.map((step, i) => {
        const done = i <= rank;
        const current = i === rank + 1 && rank < TRACKING_STEPS.length - 1;
        return (
          <li key={step.label} className="relative flex gap-4 pb-6 last:pb-0" aria-current={current ? "step" : undefined}>
            {i < TRACKING_STEPS.length - 1 && (
              <span aria-hidden className={cn("absolute left-[1.05rem] top-9 h-[calc(100%-2.25rem)] w-0.5", i < rank ? "bg-ink" : "bg-line")} />
            )}
            <span
              className={cn(
                "relative z-10 grid size-9 shrink-0 place-items-center rounded-full border-2 text-sm font-semibold",
                done ? "border-ink bg-ink text-white" : current ? "border-ink bg-white text-ink" : "border-line bg-white text-ink-soft",
              )}
            >
              {done ? <Icon name="check" size={16} strokeWidth={2.4} /> : i + 1}
            </span>
            <span className="pt-1.5">
              <span className={cn("block font-semibold leading-tight", !done && !current && "text-ink-soft")}>{step.label}</span>
              {(done || current) && <span className="mt-0.5 block text-sm text-ink-soft">{current ? `Próximo paso · ${step.hint}` : step.hint}</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function CopyCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="btn btn-ghost h-11 px-4 text-sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(code);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          /* sin permiso de portapapeles: el código igual es visible para copiarlo a mano */
        }
      }}
    >
      {copied ? "¡Copiado!" : "Copiar código"}
    </button>
  );
}

function Shipping({ order }: { order: TrackedOrder }) {
  const shipped = order.delivery_status === "enviado" || order.delivery_status === "entregado";
  return (
    <div className="mt-8 rounded-3xl bg-paper-2 p-5 sm:p-6">
      <h3 className="flex items-center gap-2 font-semibold">
        <Icon name="truck" size={20} /> Envío con Paket
      </h3>
      {!shipped ? (
        <p className="mt-2 text-sm text-ink-soft">Despachamos con Paket a todo Chile. Cuando tu pedido salga, aquí aparecerá tu número de seguimiento.</p>
      ) : order.tracking_code ? (
        <>
          <p className="mt-2 text-sm text-ink-soft">Tu pedido ya está en manos de Paket. Este es tu número de seguimiento:</p>
          <p className="mt-3 break-all rounded-xl bg-white px-4 py-3 font-mono text-lg font-semibold tracking-wide">{order.tracking_code}</p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <a href={PAKET_TRACKING_URL} target="_blank" rel="noopener noreferrer" className="btn btn-primary h-11 px-5 text-sm">
              Ver seguimiento en Paket <Icon name="external" size={16} />
            </a>
            <CopyCode code={order.tracking_code} />
          </div>
          <p className="mt-3 text-xs text-ink-soft">Copia el código y pégalo en la página de Paket para ver dónde va tu paquete.</p>
        </>
      ) : (
        <p className="mt-2 text-sm text-ink-soft">Tu pedido ya fue despachado. Estamos por cargar tu número de seguimiento; si lo necesitas ahora, escríbenos por WhatsApp.</p>
      )}
    </div>
  );
}

export function OrderTracker({ initialOrder = "" }: { initialOrder?: string }) {
  const [orderNumber, setOrderNumber] = useState(initialOrder);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TrackedOrder | null>(null);

  // Si el pedido se hizo desde este dispositivo, ya conocemos el email y lo rellenamos.
  useEffect(() => {
    if (!initialOrder) return;
    const local = getLocalOrder(normalizeOrderNumber(initialOrder));
    if (local?.customer.email) setEmail(local.customer.email);
  }, [initialOrder]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const sb = getBrowserSupabase();
    if (!sb) return;
    setLoading(true);
    setError(null);
    setResult(null);
    const { data, error: err } = await sb.rpc("track_order", { p_order_number: normalizeOrderNumber(orderNumber), p_email: email.trim() });
    setLoading(false);
    if (err) setError("No pudimos consultar tu pedido ahora. Intenta de nuevo en un momento o escríbenos por WhatsApp.");
    else if (!data) setError("No encontramos un pedido con esos datos. Revisa el número (ej: MIN-1001) y usa el mismo email de tu compra.");
    else setResult(data as TrackedOrder);
  };

  if (!isSupabaseConfigured) {
    return (
      <div className="mx-auto mt-10 max-w-xl rounded-[2rem] bg-white p-8 text-center shadow-[var(--shadow-soft)]">
        <p className="text-ink-soft">El seguimiento en línea aún no está disponible. Escríbenos y te contamos en qué estado va tu pedido.</p>
        <a href={waLink("Hola Minerva 👋 Quiero consultar el estado de mi pedido.")} target="_blank" rel="noopener noreferrer" className="btn btn-wa mt-6">
          <WhatsAppIcon /> Consultar por WhatsApp
        </a>
      </div>
    );
  }

  return (
    <div className="mx-auto mt-10 max-w-xl">
      <form onSubmit={submit} className="rounded-[2rem] bg-white p-6 shadow-[var(--shadow-soft)] sm:p-8">
        <div className="space-y-4">
          <div>
            <label htmlFor="trk-order" className="label">
              Número de pedido
            </label>
            <input
              id="trk-order"
              required
              inputMode="text"
              autoCapitalize="characters"
              autoComplete="off"
              placeholder="MIN-1001"
              className="field"
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="trk-email" className="label">
              Email de la compra
            </label>
            <input id="trk-email" type="email" required autoComplete="email" className="field" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          {error && (
            <p role="alert" className="rounded-xl bg-m-red/10 p-3 text-sm text-m-red">
              {error}
            </p>
          )}
          <button type="submit" disabled={loading} className="btn btn-primary w-full">
            {loading ? "Buscando…" : "Ver estado de mi pedido"}
          </button>
        </div>
      </form>

      {result && (
        <section aria-live="polite" className="mt-8 rounded-[2rem] bg-white p-6 shadow-[var(--shadow-soft)] sm:p-8">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="display text-2xl">Pedido {result.order_number}</h2>
            <span className="text-sm text-ink-soft">{new Date(result.created_at).toLocaleDateString("es-CL", { dateStyle: "long" })}</span>
          </div>
          <p className="mt-1 text-sm font-medium text-ink-soft">{orderStatusLabel.payment[result.payment_status]}</p>

          {result.status === "cancelado" ? (
            <p className="mt-6 rounded-2xl bg-ink/5 p-4 text-sm">
              Este pedido fue cancelado. Si crees que es un error, escríbenos por WhatsApp.
            </p>
          ) : (
            <>
              <Timeline order={result} />
              <Shipping order={result} />
            </>
          )}

          <ul className="mt-8 divide-y divide-line border-t border-line text-sm">
            {result.items.map((i, idx) => (
              <li key={idx} className="py-3">
                <span className="font-medium">
                  {i.quantity} × {i.name}
                </span>
                {i.variant && <span className="block text-ink-soft">{i.variant}</span>}
              </li>
            ))}
          </ul>

          <a
            href={waLink(`Hola Minerva 👋 Quiero consultar por mi pedido ${result.order_number}.`)}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-wa mt-4 w-full"
          >
            <WhatsAppIcon /> ¿Dudas? Escríbenos
          </a>
        </section>
      )}
    </div>
  );
}
