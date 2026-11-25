"use client";
import { useEffect, useState } from "react";
import { EMPTY_PROFILE, loadProfile, saveProfile, type Profile } from "@/lib/profile";
import { REGIONS } from "@/lib/regions";
import { pickupAddress } from "@/lib/site";
import { toast } from "@/lib/stores";

/** Mi cuenta > Mis datos: nombre, teléfono y dirección guardados para comprar más rápido. */
export function MyProfile() {
  const [p, setP] = useState<Profile | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void loadProfile().then((x) => setP(x ?? EMPTY_PROFILE));
  }, []);

  if (!p) return <div className="skeleton h-80 rounded-3xl" />;

  const set = (k: keyof Profile) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setP({ ...p, [k]: e.target.value });

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const res = await saveProfile(p);
    setSaving(false);
    if (res.ok) toast({ title: "Datos guardados", description: "Se completarán solos en tu próxima compra." });
    else toast({ title: "No se pudieron guardar", description: "Intenta de nuevo en unos minutos.", tone: "error" });
  };

  const field = (k: keyof Profile, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}, cls = "") => (
    <div className={cls}>
      <label htmlFor={`pf-${k}`} className="label">
        {label}
      </label>
      <input id={`pf-${k}`} className="field" value={String(p[k] ?? "")} onChange={set(k)} {...props} />
    </div>
  );

  return (
    <form onSubmit={save} className="rounded-3xl bg-white p-6 shadow-[var(--shadow-soft)] sm:p-8">
      <h2 className="display text-2xl">Mis datos</h2>
      <p className="mt-1 text-sm text-ink-soft">Guárdalos una vez y se completan solos al comprar.</p>
      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        {field("first_name", "Nombre", { autoComplete: "given-name" })}
        {field("last_name", "Apellido", { autoComplete: "family-name" })}
        {field("phone", "Teléfono", { type: "tel", autoComplete: "tel", inputMode: "tel", placeholder: "+56 9 1234 5678" }, "sm:col-span-2")}
        {field("address", "Dirección", { autoComplete: "street-address", placeholder: "Calle, número, depto." }, "sm:col-span-2")}
        {field("comuna", "Comuna", { autoComplete: "address-level2" })}
        <div>
          <label htmlFor="pf-region" className="label">
            Región
          </label>
          <select id="pf-region" className="field" value={p.region} onChange={set("region")} autoComplete="address-level1">
            <option value="">Elige tu región</option>
            {REGIONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
        <fieldset className="sm:col-span-2">
          <legend className="label">Entrega que prefieres</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {(
              [
                ["envio", "Envío a domicilio"],
                ["retiro", `Retiro gratis en ${pickupAddress}`],
              ] as const
            ).map(([v, l]) => (
              <label key={v} className="flex cursor-pointer items-start gap-2 rounded-2xl border border-line p-3 text-sm">
                <input type="radio" name="pf-delivery" className="mt-0.5 accent-[var(--color-ink)]" checked={p.delivery === v} onChange={() => setP({ ...p, delivery: v })} />
                {l}
              </label>
            ))}
          </div>
        </fieldset>
      </div>
      <p className="mt-5 rounded-2xl bg-paper p-3 text-xs text-ink-soft">
        🔒 No guardamos datos de tarjetas: el pago se hace en Mercado Pago, que puede recordar tu tarjeta de forma segura en tu propia cuenta de Mercado Pago.
      </p>
      <button type="submit" disabled={saving} className="btn btn-primary mt-5 w-full sm:w-auto">
        {saving ? "Guardando…" : "Guardar mis datos"}
      </button>
    </form>
  );
}
