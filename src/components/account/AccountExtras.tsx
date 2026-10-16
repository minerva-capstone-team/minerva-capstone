"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { myCoupons, type MyCoupon } from "@/lib/checkout";
import { formatCLP } from "@/lib/format";

/** Cuentas creadas desde Instagram entran con una contraseña temporal: aquí la cambian. */
export function ChangeTempPassword({ onDone }: { onDone: () => void }) {
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.length < 8) return setError("Usa al menos 8 caracteres.");
    if (pw !== pw2) return setError("Las contraseñas no coinciden.");
    if (/^Minerva-/i.test(pw)) return setError("Elige una contraseña distinta a la temporal.");
    setBusy(true);
    setError(null);
    const { error: err } = await getBrowserSupabase()!.auth.updateUser({ password: pw, data: { must_change_password: false } });
    setBusy(false);
    if (err) return setError("No pudimos cambiarla. Intenta con otra contraseña.");
    onDone();
  };

  return (
    <form onSubmit={submit} className="mt-6 rounded-2xl bg-m-yellow/15 p-4">
      <p className="font-semibold">Crea tu contraseña</p>
      <p className="mt-1 text-sm text-ink-2">Entraste con una contraseña temporal. Cámbiala por una tuya para proteger tu cuenta.</p>
      <label htmlFor="new-pw" className="label mt-3">
        Nueva contraseña
      </label>
      <input id="new-pw" type="password" autoComplete="new-password" className="field" value={pw} onChange={(e) => setPw(e.target.value)} />
      <label htmlFor="new-pw2" className="label mt-3">
        Repítela
      </label>
      <input id="new-pw2" type="password" autoComplete="new-password" className="field" value={pw2} onChange={(e) => setPw2(e.target.value)} />
      {error && (
        <p role="alert" className="mt-3 rounded-xl bg-m-red/10 p-3 text-sm text-m-red">
          {error}
        </p>
      )}
      <button type="submit" disabled={busy} className="btn btn-primary mt-4 w-full">
        {busy ? "Guardando…" : "Guardar contraseña"}
      </button>
    </form>
  );
}

export function MyCoupons() {
  const [list, setList] = useState<MyCoupon[] | null>(null);
  useEffect(() => {
    myCoupons().then(setList);
  }, []);
  if (!list?.length) return null;
  return (
    <section aria-labelledby="my-coupons">
      <h2 id="my-coupons" className="display text-2xl">
        Mis cupones
      </h2>
      <ul className="mt-4 space-y-3">
        {list.map((c) => (
          <li key={c.code} className="rounded-3xl border-2 border-dashed border-line bg-white p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="font-mono text-lg font-semibold">{c.code}</span>
              <span className="text-xl font-semibold">{c.kind === "percent" ? `${c.value}% dcto.` : `${formatCLP(c.value)} dcto.`}</span>
            </div>
            <p className="mt-1 text-sm text-ink-soft">
              {c.product_name ? (
                <>
                  Para{" "}
                  <Link href={`/productos/${c.product_slug}`} className="font-medium text-ink underline underline-offset-2">
                    {c.product_name}
                  </Link>
                </>
              ) : (
                "En toda la tienda"
              )}
              {c.min_subtotal > 0 && ` · compra mínima ${formatCLP(c.min_subtotal)}`}
              {c.expires_at && ` · vence el ${new Date(c.expires_at).toLocaleDateString("es-CL", { day: "numeric", month: "long" })}`}
            </p>
            <p className="mt-2 text-xs text-ink-soft">Se aplica solo en el checkout mientras tengas la sesión iniciada.</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
