"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { adminDb, decideSignup } from "@/lib/admin";
import { cn } from "@/lib/format";
import { toast } from "@/lib/stores";
import { AdminHeader } from "@/components/admin/AdminShell";
import { StatTile } from "@/components/admin/charts";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { Icon } from "@/components/ui/Icon";

type Status = "pendiente" | "por_aprobar" | "creada" | "rechazada";

interface Signup {
  id: string;
  email: string;
  status: Status;
  coupon_code: string | null;
  new_account: boolean | null;
  created_at: string;
  requested_at: string | null;
  decided_at: string | null;
  product: { name: string } | null;
}

const FILTERS: { id: Status | "todas"; label: string }[] = [
  { id: "por_aprobar", label: "Por revisar" },
  { id: "creada", label: "Aprobadas" },
  { id: "rechazada", label: "Rechazadas" },
  { id: "todas", label: "Todas" },
];

const BADGE: Record<Status, { text: string; cls: string }> = {
  por_aprobar: { text: "Por revisar", cls: "bg-m-yellow/25 text-[#8a5a00]" },
  creada: { text: "Aprobada", cls: "bg-m-green/15 text-[#1c6b51]" },
  rechazada: { text: "Rechazada", cls: "bg-ink/10 text-ink-soft" },
  pendiente: { text: "Sin confirmar", cls: "bg-m-blue/12 text-[#1d5f86]" },
};

function ago(iso: string) {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 2) return "hace un momento";
  if (mins < 60) return `hace ${mins} min`;
  const h = Math.round(mins / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  return `hace ${d} ${d === 1 ? "día" : "días"}`;
}

const initial = (email: string) => email.charAt(0).toUpperCase();

export default function AdminInstagramAccounts() {
  const [rows, setRows] = useState<Signup[] | null>(null);
  const [used, setUsed] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Status | "todas">("por_aprobar");
  const [busy, setBusy] = useState<string | null>(null);
  const [toReject, setToReject] = useState<Signup | null>(null);

  const load = useCallback(async () => {
    const sb = adminDb();
    const [s, c] = await Promise.all([
      sb
        .from("instagram_signups")
        .select("id,email,status,coupon_code,new_account,created_at,requested_at,decided_at,product:products(name)")
        .neq("status", "pendiente")
        .order("created_at", { ascending: false })
        .limit(300),
      sb.from("coupons").select("code,uses").eq("source", "instagram"),
    ]);
    if (s.error) {
      setError(/instagram_signups|relation/.test(s.error.message) ? "Falta aplicar las migraciones 0007 y 0008 en Supabase." : s.error.message);
      return setRows([]);
    }
    setError(null);
    setRows((s.data ?? []) as unknown as Signup[]);
    setUsed(Object.fromEntries(((c.data ?? []) as { code: string; uses: number }[]).map((x) => [x.code, x.uses])));
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const counts = useMemo(() => {
    const n = { por_aprobar: 0, creada: 0, rechazada: 0 };
    for (const r of rows ?? []) if (r.status in n) n[r.status as keyof typeof n]++;
    return n;
  }, [rows]);
  const redeemed = (rows ?? []).filter((r) => r.coupon_code && (used[r.coupon_code] ?? 0) > 0).length;
  const visible = (rows ?? []).filter((r) => filter === "todas" || r.status === filter);

  const decide = async (r: Signup, action: "approve" | "reject") => {
    setBusy(r.id);
    const res = await decideSignup(r.id, action);
    setBusy(null);
    setToReject(null);
    if (!res.ok) return toast({ title: action === "approve" ? "No se pudo aprobar" : "No se pudo rechazar", description: res.error, tone: "error" });
    toast(
      action === "approve"
        ? { title: "Cuenta aprobada", description: `Enviamos el acceso y el cupón ${res.couponCode} a ${r.email}.` }
        : { title: "Solicitud rechazada", description: "No se creó ninguna cuenta ni se envió correo." },
    );
    void load();
  };

  return (
    <>
      <AdminHeader
        title="Cuentas de Instagram"
        description="Personas que dejaron su correo por DM. Al aceptar, se crea su cuenta y se les envía el acceso con su cupón."
        action={
          <button type="button" className="btn btn-ghost" onClick={() => void load()}>
            Actualizar
          </button>
        }
      />

      {error && <p className="mb-4 rounded-2xl bg-m-red/10 p-4 text-m-red">{error}</p>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className={cn("rounded-3xl p-5 shadow-[var(--shadow-soft)]", counts.por_aprobar ? "bg-m-yellow/25" : "bg-white")}>
          <p className="text-sm text-ink-soft">Por revisar</p>
          <p className="display mt-1 text-3xl">{counts.por_aprobar}</p>
          <p className="mt-1 text-xs text-ink-soft">{counts.por_aprobar ? "Esperan tu respuesta" : "Todo al día"}</p>
        </div>
        <StatTile label="Aprobadas" value={String(counts.creada)} hint="Con cuenta y cupón enviados" />
        <StatTile label="Rechazadas" value={String(counts.rechazada)} />
        <StatTile label="Cupones usados" value={String(redeemed)} hint={counts.creada ? `${Math.round((redeemed / counts.creada) * 100)}% de las aprobadas` : "Aún sin aprobadas"} />
      </div>

      <div className="no-scrollbar -mx-4 mt-6 flex gap-2 overflow-x-auto px-4" role="group" aria-label="Filtrar solicitudes">
        {FILTERS.map((f) => (
          <button key={f.id} type="button" className="chip shrink-0" aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>
            {f.label}
            <span className="opacity-60">{f.id === "todas" ? (rows ?? []).length : counts[f.id as keyof typeof counts]}</span>
          </button>
        ))}
      </div>

      {rows === null ? (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {[0, 1].map((i) => (
            <div key={i} className="skeleton h-40 rounded-3xl" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="mt-4 rounded-3xl bg-white p-12 text-center text-ink-soft shadow-[var(--shadow-soft)]">
          <Icon name="check" size={28} className="mx-auto mb-3 text-m-green" />
          {filter === "por_aprobar" ? "No hay solicitudes por revisar." : "No hay solicitudes en esta lista."}
        </div>
      ) : (
        <ul className="mt-4 grid gap-3 md:grid-cols-2">
          {visible.map((r) => {
            const badge = BADGE[r.status];
            const uses = r.coupon_code ? used[r.coupon_code] ?? 0 : 0;
            return (
              <li key={r.id} className={cn("flex flex-col rounded-3xl bg-white p-5 shadow-[var(--shadow-soft)]", r.status === "por_aprobar" && "ring-2 ring-m-yellow")}>
                <div className="flex items-start gap-3">
                  <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-full bg-gradient-minerva font-semibold text-white">
                    {initial(r.email)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{r.email}</p>
                    <p className="text-sm text-ink-soft">Solicitó {ago(r.requested_at ?? r.created_at)}</p>
                  </div>
                  <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-xs font-medium", badge.cls)}>{badge.text}</span>
                </div>

                <p className="mt-3 text-sm">
                  <span className="text-ink-soft">Le interesaba: </span>
                  <span className="rounded-full bg-paper-2 px-2.5 py-1 text-xs font-medium">{r.product?.name ?? "Toda la tienda"}</span>
                </p>

                {r.status === "por_aprobar" && (
                  <div className="mt-4 flex gap-2">
                    <button type="button" disabled={busy === r.id} className="btn btn-primary flex-1" onClick={() => void decide(r, "approve")}>
                      <Icon name="check" size={18} /> {busy === r.id ? "Creando…" : "Aceptar"}
                    </button>
                    <button type="button" disabled={busy === r.id} className="btn btn-ghost flex-1 text-m-red" onClick={() => setToReject(r)}>
                      <Icon name="x" size={18} /> Rechazar
                    </button>
                  </div>
                )}

                {r.status === "creada" && (
                  <div className="mt-4 rounded-2xl bg-paper-2 p-3 text-sm">
                    <p className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-mono font-semibold">{r.coupon_code}</span>
                      <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", uses > 0 ? "bg-m-green/15 text-[#1c6b51]" : "bg-white text-ink-soft")}>
                        {uses > 0 ? "Cupón usado" : "Cupón sin usar"}
                      </span>
                    </p>
                    <p className="mt-1 text-xs text-ink-soft">
                      {r.new_account ? "Se creó una cuenta nueva" : "Ya tenía cuenta"}
                      {r.decided_at && ` · aprobada ${ago(r.decided_at)}`}
                    </p>
                  </div>
                )}

                {r.status === "rechazada" && <p className="mt-4 text-xs text-ink-soft">{r.decided_at ? `Rechazada ${ago(r.decided_at)}. ` : ""}No se creó cuenta ni se envió correo.</p>}
              </li>
            );
          })}
        </ul>
      )}

      <ConfirmDialog
        open={Boolean(toReject)}
        title="¿Rechazar esta solicitud?"
        description={`No se creará la cuenta de ${toReject?.email ?? ""} ni se le enviará correo.`}
        confirmLabel="Rechazar"
        busyLabel="Rechazando…"
        busy={Boolean(toReject && busy === toReject.id)}
        onCancel={() => setToReject(null)}
        onConfirm={() => toReject && void decide(toReject, "reject")}
      />
    </>
  );
}
