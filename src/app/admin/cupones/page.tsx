"use client";
import { useCallback, useEffect, useState } from "react";
import { adminDb, errorMessage } from "@/lib/admin";
import { cn, formatCLP } from "@/lib/format";
import { toast } from "@/lib/stores";
import { AdminHeader } from "@/components/admin/AdminShell";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { Icon } from "@/components/ui/Icon";

interface Coupon {
  id: string;
  code: string;
  kind: "percent" | "fixed";
  value: number;
  min_subtotal: number;
  max_uses: number | null;
  uses: number;
  expires_at: string | null;
  active: boolean;
}

interface Draft {
  id?: string;
  code: string;
  kind: "percent" | "fixed";
  value: string;
  min_subtotal: string;
  max_uses: string;
  expires: string;
  active: boolean;
}

const EMPTY: Draft = { code: "", kind: "percent", value: "10", min_subtotal: "0", max_uses: "", expires: "", active: true };

function status(c: Coupon) {
  if (!c.active) return { label: "Pausado", tone: "bg-ink/10 text-ink-soft" };
  if (c.expires_at && new Date(c.expires_at) <= new Date()) return { label: "Vencido", tone: "bg-m-red/10 text-m-red" };
  if (c.max_uses !== null && c.uses >= c.max_uses) return { label: "Agotado", tone: "bg-m-yellow/20 text-[#8a5a00]" };
  return { label: "Activo", tone: "bg-m-green/15 text-[#1c6b51]" };
}

const describe = (c: Coupon) =>
  [
    c.kind === "percent" ? `${c.value}% de descuento` : `${formatCLP(c.value)} de descuento`,
    c.min_subtotal > 0 ? `compra mínima ${formatCLP(c.min_subtotal)}` : null,
    `${c.uses}${c.max_uses !== null ? ` de ${c.max_uses}` : ""} ${c.uses === 1 ? "uso" : "usos"}`,
    c.expires_at ? `vence ${new Date(c.expires_at).toLocaleDateString("es-CL")}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

export default function AdminCoupons() {
  const [items, setItems] = useState<Coupon[] | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<Coupon | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await adminDb().from("coupons").select("*").order("created_at", { ascending: false });
    if (error) toast({ title: "Error al cargar cupones", description: errorMessage(error), tone: "error" });
    setItems((data as Coupon[]) ?? []);
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft) return;
    const value = Number(draft.value);
    if (!Number.isInteger(value) || value <= 0 || (draft.kind === "percent" && value > 100)) {
      return toast({ title: "Revisa el descuento", description: draft.kind === "percent" ? "Debe ser un porcentaje entre 1 y 100." : "Debe ser un monto mayor a 0.", tone: "error" });
    }
    setSaving(true);
    const payload = {
      code: draft.code.trim().toUpperCase(),
      kind: draft.kind,
      value,
      min_subtotal: Math.max(0, Number(draft.min_subtotal) || 0),
      max_uses: draft.max_uses.trim() ? Math.max(1, Number(draft.max_uses)) : null,
      expires_at: draft.expires ? new Date(`${draft.expires}T23:59:59`).toISOString() : null,
      active: draft.active,
    };
    const sb = adminDb();
    const { error } = draft.id ? await sb.from("coupons").update(payload).eq("id", draft.id) : await sb.from("coupons").insert(payload);
    setSaving(false);
    if (error) {
      const msg = /duplicate key/i.test(error.message) ? "Ya existe un cupón con ese código." : /check constraint/i.test(error.message) ? "El código debe tener 3 a 30 letras, números, guion o guion bajo." : errorMessage(error);
      return toast({ title: "No se pudo guardar", description: msg, tone: "error" });
    }
    toast({ title: draft.id ? "Cupón actualizado" : "Cupón creado" });
    setDraft(null);
    void load();
  };

  const toggle = async (c: Coupon) => {
    const { error } = await adminDb().from("coupons").update({ active: !c.active }).eq("id", c.id);
    if (error) return toast({ title: "No se pudo actualizar", description: errorMessage(error), tone: "error" });
    void load();
  };

  const remove = async () => {
    if (!toDelete) return;
    const { error } = await adminDb().from("coupons").delete().eq("id", toDelete.id);
    if (error) return toast({ title: "No se pudo eliminar", description: errorMessage(error), tone: "error" });
    toast({ title: "Cupón eliminado" });
    setToDelete(null);
    void load();
  };

  return (
    <>
      <AdminHeader
        title="Cupones"
        description="Códigos de descuento para tus clientas. Se validan y canjean en el servidor."
        action={
          <button type="button" className="btn btn-primary" onClick={() => setDraft(EMPTY)}>
            <Icon name="plus" size={18} /> Nuevo cupón
          </button>
        }
      />

      {draft && (
        <form onSubmit={save} className="mb-6 grid gap-4 rounded-3xl bg-white p-6 shadow-[var(--shadow-soft)] sm:grid-cols-2">
          <h2 className="display text-xl sm:col-span-2">{draft.id ? "Editar cupón" : "Nuevo cupón"}</h2>
          <div>
            <label htmlFor="cp-code" className="label">
              Código
            </label>
            <input
              id="cp-code"
              required
              minLength={3}
              maxLength={30}
              className="field uppercase"
              placeholder="BIENVENIDA10"
              value={draft.code}
              onChange={(e) => setDraft({ ...draft, code: e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, "") })}
            />
          </div>
          <div>
            <label htmlFor="cp-kind" className="label">
              Tipo
            </label>
            <select id="cp-kind" className="field" value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value as Draft["kind"] })}>
              <option value="percent">Porcentaje (%)</option>
              <option value="fixed">Monto fijo ($)</option>
            </select>
          </div>
          <div>
            <label htmlFor="cp-value" className="label">
              {draft.kind === "percent" ? "Descuento (%)" : "Descuento ($)"}
            </label>
            <input id="cp-value" type="number" required min={1} max={draft.kind === "percent" ? 100 : undefined} className="field" value={draft.value} onChange={(e) => setDraft({ ...draft, value: e.target.value })} />
          </div>
          <div>
            <label htmlFor="cp-min" className="label">
              Compra mínima ($)
            </label>
            <input id="cp-min" type="number" min={0} className="field" value={draft.min_subtotal} onChange={(e) => setDraft({ ...draft, min_subtotal: e.target.value })} />
          </div>
          <div>
            <label htmlFor="cp-max" className="label">
              Máximo de usos <span className="font-normal text-ink-soft">(vacío = sin límite)</span>
            </label>
            <input id="cp-max" type="number" min={1} className="field" value={draft.max_uses} onChange={(e) => setDraft({ ...draft, max_uses: e.target.value })} />
          </div>
          <div>
            <label htmlFor="cp-exp" className="label">
              Vence el <span className="font-normal text-ink-soft">(vacío = no vence)</span>
            </label>
            <input id="cp-exp" type="date" className="field" value={draft.expires} onChange={(e) => setDraft({ ...draft, expires: e.target.value })} />
          </div>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input type="checkbox" className="size-4 accent-[var(--color-ink)]" checked={draft.active} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} />
            Cupón activo
          </label>
          <div className="flex justify-end gap-2 sm:col-span-2">
            <button type="button" className="btn btn-ghost" onClick={() => setDraft(null)}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </form>
      )}

      <div className="rounded-3xl bg-white shadow-[var(--shadow-soft)]">
        {items === null ? (
          <div className="space-y-2 p-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="skeleton h-16 rounded-2xl" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="p-10 text-center text-ink-soft">Aún no hay cupones. Crea el primero con “Nuevo cupón”.</p>
        ) : (
          <ul className="divide-y divide-line">
            {items.map((c) => {
              const s = status(c);
              return (
                <li key={c.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 p-4">
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="font-mono text-base font-semibold">{c.code}</span>
                      <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", s.tone)}>{s.label}</span>
                    </span>
                    <span className="block text-sm text-ink-soft">{describe(c)}</span>
                  </span>
                  <button type="button" className="btn btn-ghost h-9 px-3 text-xs" onClick={() => toggle(c)}>
                    {c.active ? "Pausar" : "Activar"}
                  </button>
                  <button
                    type="button"
                    className="grid size-9 place-items-center rounded-full hover:bg-paper"
                    aria-label={`Editar ${c.code}`}
                    onClick={() =>
                      setDraft({
                        id: c.id,
                        code: c.code,
                        kind: c.kind,
                        value: String(c.value),
                        min_subtotal: String(c.min_subtotal),
                        max_uses: c.max_uses === null ? "" : String(c.max_uses),
                        expires: c.expires_at ? c.expires_at.slice(0, 10) : "",
                        active: c.active,
                      })
                    }
                  >
                    <Icon name="edit" size={17} />
                  </button>
                  <button type="button" className="grid size-9 place-items-center rounded-full hover:bg-m-red/10 hover:text-m-red" aria-label={`Eliminar ${c.code}`} onClick={() => setToDelete(c)}>
                    <Icon name="trash" size={17} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="¿Eliminar cupón?"
        description={`Se elimina “${toDelete?.code}”. Los pedidos que ya lo usaron conservan su descuento.`}
        onCancel={() => setToDelete(null)}
        onConfirm={remove}
      />
    </>
  );
}
