"use client";
import { useEffect, useMemo, useState } from "react";
import { adminDb, errorMessage, revalidateStore } from "@/lib/admin";
import { cn, formatCLP } from "@/lib/format";
import { toast } from "@/lib/stores";
import { DATES, subtractBusinessDays } from "@/lib/commercial-dates";
import { computePromo, DEFAULT_PROMO, type PromoSettings } from "@/lib/promo";
import { AdminHeader } from "@/components/admin/AdminShell";
import { Icon } from "@/components/ui/Icon";

interface Item {
  id: string;
  name: string;
  price: number;
  stock: number;
  active: boolean;
  customizable: boolean;
}

const DAY = 86_400_000;
/** yyyy-mm-dd en hora local, para los <input type="date">. */
const toDateInput = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const startOf = (v: string) => (v ? new Date(`${v}T00:00:00`).toISOString() : null);
const endOf = (v: string) => (v ? new Date(`${v}T23:59:59`).toISOString() : null);
const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("es-CL", { day: "numeric", month: "long" }) : "—");

function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={cn("relative h-7 w-12 shrink-0 rounded-full transition-colors", on ? "bg-m-green" : "bg-ink/20")}
    >
      <span className={cn("absolute top-1 size-5 rounded-full bg-white shadow transition-[left]", on ? "left-6" : "left-1")} />
    </button>
  );
}

function PercentField({ id, value, onChange, min, presets }: { id: string; value: number; onChange: (v: number) => void; min: number; presets: number[] }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative w-24">
        <input id={id} type="number" inputMode="numeric" min={min} max={70} className="field pr-8" value={value} onChange={(e) => onChange(Math.max(min, Math.min(70, Number(e.target.value) || 0)))} />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-soft">%</span>
      </div>
      {presets.map((p) => (
        <button key={p} type="button" className="chip" aria-pressed={value === p} onClick={() => onChange(p)}>
          {p === 0 ? "Solo destacar" : `${p}%`}
        </button>
      ))}
    </div>
  );
}

export default function AdminPromotions() {
  const [s, setS] = useState<PromoSettings | null>(null);
  const [saved, setSaved] = useState<PromoSettings | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const db = adminDb();
    Promise.all([
      db.from("promo_settings").select("*").maybeSingle(),
      db.from("products").select("id,name,price,stock,active,customizable").eq("active", true).order("name"),
    ]).then(([cfg, prods]) => {
      if (cfg.error) {
        setError(/promo_settings|relation/.test(cfg.error.message) ? "Falta aplicar la migración 0010 en Supabase." : cfg.error.message);
        setS(DEFAULT_PROMO);
      } else {
        const v = { ...DEFAULT_PROMO, ...(cfg.data as Partial<PromoSettings> | null) };
        v.season_product_ids = v.season_product_ids ?? [];
        setS(v);
        setSaved(v);
      }
      setItems(((prods.data ?? []) as Item[]).map((p) => ({ ...p, price: Number(p.price) })));
    });
  }, []);

  const set = (patch: Partial<PromoSettings>) => setS((v) => (v ? { ...v, ...patch } : v));
  const dirty = JSON.stringify(s) !== JSON.stringify(saved);

  // Próxima fecha comercial (hasta 60 días) para sugerir la campaña.
  const next = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return (
      DATES.map((c) => {
        let date = c.date(today.getFullYear());
        if (date < today) date = c.date(today.getFullYear() + 1);
        return { ...c, when: date };
      })
        .filter((c) => (c.when.getTime() - today.getTime()) / DAY <= 60)
        .sort((a, b) => a.when.getTime() - b.when.getTime())[0] ?? null
    );
  }, []);

  const suggested = useMemo(() => (next ? items.filter((p) => p.stock > 0 && next.keywords.test(p.name)).sort((a, b) => b.stock - a.stock) : []), [items, next]);

  const applyNextDate = () => {
    if (!next) return;
    const today = new Date();
    const prep = subtractBusinessDays(next.when, next.leadDays);
    const start = prep > today ? prep : today;
    set({
      season_name: next.name,
      season_starts_at: startOf(toDateInput(start.toISOString())),
      season_ends_at: endOf(toDateInput(next.when.toISOString())),
      season_product_ids: suggested.slice(0, 8).map((p) => p.id),
      season_enabled: true,
    });
  };

  const preview = useMemo(() => (s ? items.map((p) => ({ p, promo: computePromo(p, s) })).filter((x) => x.promo) : []), [items, s]);
  const lowPreview = preview.filter((x) => x.promo!.kind === "stock");
  const seasonPreview = preview.filter((x) => x.promo!.kind === "temporada");

  const save = async () => {
    if (!s) return;
    if (s.season_enabled) {
      if (!s.season_name?.trim()) return toast({ title: "Ponle nombre a la campaña", tone: "error" });
      if (!s.season_product_ids.length) return toast({ title: "Elige al menos un producto para la campaña", tone: "error" });
      if (s.season_starts_at && s.season_ends_at && s.season_ends_at <= s.season_starts_at) return toast({ title: "La fecha de término debe ser después del inicio", tone: "error" });
    }
    setSaving(true);
    const { error: err } = await adminDb()
      .from("promo_settings")
      .update({ ...s, season_name: s.season_name?.trim() || null, updated_at: new Date().toISOString() })
      .eq("id", true);
    setSaving(false);
    if (err) return toast({ title: "No se pudo guardar", description: errorMessage(err), tone: "error" });
    setSaved(s);
    void revalidateStore();
    toast({ title: "Promociones guardadas", description: "La tienda se actualiza en menos de un minuto." });
  };

  if (!s) return <div className="skeleton h-96 rounded-3xl" />;

  const toggleProduct = (id: string) =>
    set({ season_product_ids: s.season_product_ids.includes(id) ? s.season_product_ids.filter((x) => x !== id) : [...s.season_product_ids, id] });
  const ordered = [...suggested, ...items.filter((p) => !suggested.includes(p))];

  return (
    <>
      <AdminHeader
        title="Promociones automáticas"
        description="Rebaja sola lo que queda con poco stock y arma campañas para las fechas especiales. El precio que ve la clienta es el que se cobra."
        action={
          <button type="button" className="btn btn-primary" disabled={!dirty || saving || Boolean(error)} onClick={() => void save()}>
            {saving ? "Guardando…" : dirty ? "Guardar cambios" : "Guardado"}
          </button>
        }
      />
      {error && <p className="mb-4 rounded-2xl bg-m-red/10 p-4 text-m-red">{error}</p>}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ---------------- Bajo stock ---------------- */}
        <section className="rounded-3xl bg-white p-6 shadow-[var(--shadow-soft)]" aria-labelledby="low-title">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 id="low-title" className="display text-2xl">
                Liquidación por bajo stock
              </h2>
              <p className="mt-1 text-sm text-ink-soft">Cuando un producto queda con pocas unidades, baja de precio solo. Al reponer stock vuelve a su precio normal.</p>
            </div>
            <Switch on={s.low_stock_enabled} onChange={(v) => set({ low_stock_enabled: v })} label="Activar liquidación por bajo stock" />
          </div>

          <div className={cn("mt-6 space-y-5", !s.low_stock_enabled && "opacity-50")}>
            <div>
              <label htmlFor="low-threshold" className="label">
                Se activa cuando quedan
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="low-threshold"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={50}
                  className="field w-24"
                  value={s.low_stock_threshold}
                  onChange={(e) => set({ low_stock_threshold: Math.max(1, Math.min(50, Number(e.target.value) || 1)) })}
                />
                <span className="text-sm text-ink-soft">unidades o menos</span>
              </div>
            </div>
            <div>
              <label htmlFor="low-percent" className="label">
                Descuento
              </label>
              <PercentField id="low-percent" value={s.low_stock_percent} onChange={(v) => set({ low_stock_percent: v })} min={1} presets={[10, 15, 20, 30]} />
            </div>
            <label className="flex items-center gap-3 text-sm">
              <input type="checkbox" className="size-4" checked={s.low_stock_skip_custom} onChange={(e) => set({ low_stock_skip_custom: e.target.checked })} />
              No aplicar a productos personalizables
            </label>
          </div>

          <div className="mt-6 rounded-2xl bg-paper-2 p-4">
            <p className="text-sm font-semibold">{s.low_stock_enabled ? `Ahora mismo: ${lowPreview.length} producto${lowPreview.length === 1 ? "" : "s"} en liquidación` : "Apagado"}</p>
            {s.low_stock_enabled && lowPreview.length > 0 && (
              <ul className="mt-3 divide-y divide-line text-sm">
                {lowPreview.map(({ p, promo }) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 py-2">
                    <span className="min-w-0 truncate">
                      {p.name} <span className="text-ink-soft">· quedan {p.stock}</span>
                    </span>
                    <span className="shrink-0 tabular-nums">
                      <span className="mr-2 text-ink-soft line-through">{formatCLP(p.price)}</span>
                      <strong>{formatCLP(promo!.price)}</strong>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* ---------------- Campaña por fecha ---------------- */}
        <section className="rounded-3xl bg-white p-6 shadow-[var(--shadow-soft)]" aria-labelledby="season-title">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 id="season-title" className="display text-2xl">
                Campaña por fecha especial
              </h2>
              <p className="mt-1 text-sm text-ink-soft">Los productos elegidos aparecen destacados en la portada y, si quieres, con descuento entre dos fechas.</p>
            </div>
            <Switch on={s.season_enabled} onChange={(v) => set({ season_enabled: v })} label="Activar campaña" />
          </div>

          {next && (
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-m-violet/10 p-4 text-sm">
              <p>
                <strong>Sugerencia: {next.name}</strong> ({next.when.toLocaleDateString("es-CL", { day: "numeric", month: "long" })}).{" "}
                {suggested.length ? `${suggested.length} producto${suggested.length === 1 ? "" : "s"} con stock calzan.` : "Ningún producto con stock calza con esta fecha."}
              </p>
              <button type="button" className="btn btn-ghost h-10 px-4 text-sm" onClick={applyNextDate}>
                Usar esta fecha
              </button>
            </div>
          )}

          <div className={cn("mt-5 space-y-5", !s.season_enabled && "opacity-50")}>
            <div>
              <label htmlFor="season-name" className="label">
                Nombre de la campaña
              </label>
              <input id="season-name" className="field" maxLength={60} placeholder="Ej: Día de la Madre" value={s.season_name ?? ""} onChange={(e) => set({ season_name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="season-start" className="label">
                  Desde
                </label>
                <input id="season-start" type="date" className="field" value={toDateInput(s.season_starts_at)} onChange={(e) => set({ season_starts_at: startOf(e.target.value) })} />
              </div>
              <div>
                <label htmlFor="season-end" className="label">
                  Hasta
                </label>
                <input id="season-end" type="date" className="field" value={toDateInput(s.season_ends_at)} onChange={(e) => set({ season_ends_at: endOf(e.target.value) })} />
              </div>
            </div>
            <div>
              <label htmlFor="season-percent" className="label">
                Descuento
              </label>
              <PercentField id="season-percent" value={s.season_percent} onChange={(v) => set({ season_percent: v })} min={0} presets={[0, 10, 15, 20]} />
            </div>

            <fieldset>
              <legend className="label">
                Productos de la campaña <span className="font-normal text-ink-soft">({s.season_product_ids.length} elegidos · solo se muestran los que tienen stock)</span>
              </legend>
              <ul className="max-h-72 space-y-1 overflow-y-auto rounded-2xl border border-line p-2">
                {ordered.map((p) => {
                  const checked = s.season_product_ids.includes(p.id);
                  const isSuggested = suggested.includes(p);
                  return (
                    <li key={p.id}>
                      <label className={cn("flex cursor-pointer items-center gap-3 rounded-xl px-2 py-2 text-sm hover:bg-paper", p.stock <= 0 && "cursor-not-allowed opacity-50")}>
                        <input type="checkbox" className="size-4" checked={checked} disabled={p.stock <= 0} onChange={() => toggleProduct(p.id)} />
                        <span className="min-w-0 flex-1 truncate">{p.name}</span>
                        {isSuggested && <span className="rounded-full bg-m-violet/10 px-2 py-0.5 text-xs text-m-violet">Sugerido</span>}
                        <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-xs tabular-nums", p.stock <= 0 ? "bg-m-red/10 text-m-red" : "bg-paper-2 text-ink-2")}>
                          {p.stock <= 0 ? "sin stock" : `${p.stock} u.`}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </fieldset>
          </div>

          <div className="mt-6 rounded-2xl bg-paper-2 p-4 text-sm">
            {!s.season_enabled ? (
              <p className="font-semibold">Apagada</p>
            ) : seasonPreview.length ? (
              <p>
                <strong>En la tienda ahora:</strong> “Especial {s.season_name || "…"}” con {seasonPreview.length} producto{seasonPreview.length === 1 ? "" : "s"}
                {s.season_percent > 0 ? `, ${s.season_percent}% de descuento` : ", sin descuento"} hasta el {fmt(s.season_ends_at)}.
              </p>
            ) : (
              <p>
                <strong>Programada:</strong> se verá en la tienda del {fmt(s.season_starts_at)} al {fmt(s.season_ends_at)}.
              </p>
            )}
          </div>
        </section>
      </div>

      <p className="mt-6 text-xs text-ink-soft">
        Si un producto calza con las dos promociones, se aplica el descuento mayor. Los cupones se suman encima del precio rebajado. Los cambios se ven en la tienda en menos de un minuto.
      </p>
    </>
  );
}
