"use client";
import { useCallback, useEffect, useState } from "react";
import { adminDb, errorMessage } from "@/lib/admin";
import { formatCLP } from "@/lib/format";
import { REGIONS } from "@/lib/regions";
import { toast } from "@/lib/stores";
import { AdminHeader } from "@/components/admin/AdminShell";

interface Form {
  free_shipping_min: string;
  reservation_hours: string;
  max_pending: string;
  pickup_enabled: boolean;
  pickup_address: string;
  pickup_note: string;
  rates: Record<string, { price: string; note: string }>;
}

const toInt = (s: string) => (s.trim() === "" ? null : Math.max(0, Math.round(Number(s))));

export default function AdminShipping() {
  const [form, setForm] = useState<Form | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const sb = adminDb();
    const [s, r] = await Promise.all([sb.from("store_settings").select("*").maybeSingle(), sb.from("shipping_rates").select("*")]);
    const err = s.error ?? r.error;
    if (err) toast({ title: "Error al cargar", description: errorMessage(err), tone: "error" });
    const rates: Form["rates"] = {};
    for (const region of REGIONS) {
      const row = (r.data ?? []).find((x) => x.region === region);
      rates[region] = { price: row?.price == null ? "" : String(row.price), note: row?.note ?? "" };
    }
    setForm({
      free_shipping_min: s.data?.free_shipping_min == null ? "" : String(s.data.free_shipping_min),
      reservation_hours: String(s.data?.reservation_hours ?? 48),
      max_pending: String(s.data?.max_pending_orders_per_email ?? 3),
      pickup_enabled: s.data?.pickup_enabled !== false,
      pickup_address: s.data?.pickup_address ?? "Rodolfo Jaramillo 2723, Padre Hurtado",
      pickup_note: s.data?.pickup_note ?? "",
      rates,
    });
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    const sb = adminDb();
    const [a, b] = await Promise.all([
      sb.from("store_settings").update({
        free_shipping_min: toInt(form.free_shipping_min),
        reservation_hours: Math.min(720, Math.max(1, Number(form.reservation_hours) || 48)),
        max_pending_orders_per_email: Math.min(50, Math.max(1, Number(form.max_pending) || 3)),
        pickup_enabled: form.pickup_enabled,
        pickup_address: form.pickup_address.trim() || "Rodolfo Jaramillo 2723, Padre Hurtado",
        pickup_note: form.pickup_note.trim() || null,
      }).eq("id", true),
      sb.from("shipping_rates").upsert(
        REGIONS.map((region) => ({ region, price: toInt(form.rates[region].price), note: form.rates[region].note.trim() || null })),
        { onConflict: "region" },
      ),
    ]);
    setSaving(false);
    const err = a.error ?? b.error;
    if (err) return toast({ title: "No se pudo guardar", description: errorMessage(err), tone: "error" });
    toast({ title: "Envíos actualizados" });
    void load();
  };

  return (
    <>
      <AdminHeader title="Envíos" description="Cuánto cobras de despacho por región, envío gratis y tiempo de reserva del stock." />

      {!form ? (
        <div className="skeleton h-96 rounded-3xl" />
      ) : (
        <form onSubmit={save} className="space-y-6">
          <section className="grid gap-4 rounded-3xl bg-white p-6 shadow-[var(--shadow-soft)] sm:grid-cols-3">
            <h2 className="display text-xl sm:col-span-3">Reglas generales</h2>
            <div>
              <label htmlFor="sh-free" className="label">
                Envío gratis desde ($)
              </label>
              <input id="sh-free" type="number" min={0} className="field" placeholder="Sin envío gratis" value={form.free_shipping_min} onChange={(e) => setForm({ ...form, free_shipping_min: e.target.value })} />
              <p className="mt-1 text-xs text-ink-soft">Se mide sobre el subtotal ya con descuento. Vacío = desactivado.</p>
            </div>
            <div>
              <label htmlFor="sh-hours" className="label">
                Horas que se reserva el stock
              </label>
              <input id="sh-hours" type="number" min={1} max={720} className="field" value={form.reservation_hours} onChange={(e) => setForm({ ...form, reservation_hours: e.target.value })} />
              <p className="mt-1 text-xs text-ink-soft">Un pedido sin pago se cancela solo pasado este tiempo y devuelve el stock.</p>
            </div>
            <div>
              <label htmlFor="sh-pend" className="label">
                Pedidos sin pagar por email
              </label>
              <input id="sh-pend" type="number" min={1} max={50} className="field" value={form.max_pending} onChange={(e) => setForm({ ...form, max_pending: e.target.value })} />
              <p className="mt-1 text-xs text-ink-soft">Máximo en 24 horas; evita que alguien bloquee tu stock.</p>
            </div>
          </section>

          <section className="grid gap-4 rounded-3xl bg-white p-6 shadow-[var(--shadow-soft)] sm:grid-cols-2">
            <h2 className="display text-xl sm:col-span-2">Retiro en tienda</h2>
            <label className="flex cursor-pointer items-start gap-3 sm:col-span-2">
              <input type="checkbox" className="mt-1 size-4 accent-[var(--color-ink)]" checked={form.pickup_enabled} onChange={(e) => setForm({ ...form, pickup_enabled: e.target.checked })} />
              <span>
                <span className="block font-semibold">Ofrecer retiro gratis en el checkout</span>
                <span className="text-sm text-ink-soft">Si lo desactivas, los clientes solo verán envío a domicilio.</span>
              </span>
            </label>
            <div>
              <label htmlFor="sh-pick-addr" className="label">
                Dirección de retiro
              </label>
              <input id="sh-pick-addr" className="field" maxLength={160} value={form.pickup_address} onChange={(e) => setForm({ ...form, pickup_address: e.target.value })} />
            </div>
            <div>
              <label htmlFor="sh-pick-note" className="label">
                Horario o indicaciones <span className="font-normal text-ink-soft">(opcional)</span>
              </label>
              <input id="sh-pick-note" className="field" maxLength={200} placeholder="Ej: Lunes a viernes de 10:00 a 18:00, avisando antes por WhatsApp." value={form.pickup_note} onChange={(e) => setForm({ ...form, pickup_note: e.target.value })} />
            </div>
          </section>

          <section className="rounded-3xl bg-white p-6 shadow-[var(--shadow-soft)]">
            <h2 className="display text-xl">Tarifa por región</h2>
            <p className="mt-1 text-sm text-ink-soft">
              Deja el precio vacío para “se coordina por WhatsApp” (no se suma al total). Paket publica una tarifa fija de $3.500 para todo Santiago; las demás regiones
              conviene cotizarlas con ellos.
            </p>
            <ul className="mt-5 divide-y divide-line">
              {REGIONS.map((region) => (
                <li key={region} className="grid gap-2 py-3 sm:grid-cols-[1fr_9rem_1fr] sm:items-center">
                  <span className="text-sm font-medium">{region}</span>
                  <div>
                    <label htmlFor={`sh-${region}`} className="sr-only">
                      Precio {region}
                    </label>
                    <input
                      id={`sh-${region}`}
                      type="number"
                      min={0}
                      className="field h-11"
                      placeholder="Por coordinar"
                      value={form.rates[region].price}
                      onChange={(e) => setForm({ ...form, rates: { ...form.rates, [region]: { ...form.rates[region], price: e.target.value } } })}
                    />
                  </div>
                  <div>
                    <label htmlFor={`shn-${region}`} className="sr-only">
                      Nota {region}
                    </label>
                    <input
                      id={`shn-${region}`}
                      className="field h-11"
                      maxLength={120}
                      placeholder={form.rates[region].price ? formatCLP(Number(form.rates[region].price)) : "Nota interna (opcional)"}
                      value={form.rates[region].note}
                      onChange={(e) => setForm({ ...form, rates: { ...form.rates, [region]: { ...form.rates[region], note: e.target.value } } })}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <div className="flex justify-end">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Guardando…" : "Guardar cambios"}
            </button>
          </div>
        </form>
      )}
    </>
  );
}
