"use client";
import { useCallback, useEffect, useState } from "react";
import { adminDb, errorMessage } from "@/lib/admin";
import { UPLOADS_BUCKET } from "@/lib/supabase/config";
import { cn, formatCLP } from "@/lib/format";
import { orderStatusLabel } from "@/lib/order-status";
import { toast } from "@/lib/stores";
import { waTo } from "@/lib/whatsapp";
import { AdminHeader } from "@/components/admin/AdminShell";
import { Icon, WhatsAppIcon } from "@/components/ui/Icon";

interface OrderRow {
  id: string;
  order_number: string;
  total: number;
  status: keyof typeof orderStatusLabel.status;
  payment_status: keyof typeof orderStatusLabel.payment;
  delivery_status: keyof typeof orderStatusLabel.delivery;
  payment_method: string;
  notes: string | null;
  tracking_code: string | null;
  created_at: string;
  customer: { first_name: string; last_name: string; email: string; phone: string; address: string; comuna: string; region: string } | null;
  order_items: {
    id: string;
    product_name: string;
    variant_name: string | null;
    quantity: number;
    unit_price: number;
    customization_data: { text?: string | null; name?: string | null; image_path?: string | null } | null;
  }[];
}

const STATUS_COLORS: Record<string, string> = {
  pendiente: "bg-m-yellow/20 text-[#8a5a00]",
  confirmado: "bg-m-blue/15 text-[#1d5f86]",
  en_produccion: "bg-m-violet/15 text-m-violet",
  listo: "bg-m-magenta/15 text-[#a3205d]",
  entregado: "bg-m-green/15 text-[#1c6b51]",
  cancelado: "bg-ink/10 text-ink-soft",
};

function CustomImage({ path }: { path: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    adminDb()
      .storage.from(UPLOADS_BUCKET)
      .createSignedUrl(path, 3600)
      .then(({ data }) => setUrl(data?.signedUrl ?? null));
  }, [path]);
  if (!url) return <span className="skeleton inline-block size-16 rounded-xl" />;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="inline-block" aria-label="Abrir imagen del cliente">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="Imagen enviada por el cliente" className="size-16 rounded-xl object-cover ring-1 ring-line" />
    </a>
  );
}

export default function AdminOrders() {
  const [orders, setOrders] = useState<OrderRow[] | null>(null);
  const [filter, setFilter] = useState<string>("todos");
  const [open, setOpen] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await adminDb()
      .from("orders")
      .select("*, customer:customers(*), order_items(*)")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) toast({ title: "Error al cargar pedidos", description: error.message, tone: "error" });
    setOrders((data as OrderRow[]) ?? []);
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const update = async (o: OrderRow, values: Partial<Pick<OrderRow, "status" | "payment_status" | "delivery_status" | "tracking_code">>) => {
    setOrders((list) => list?.map((x) => (x.id === o.id ? { ...x, ...values } : x)) ?? null);
    const { error } = await adminDb().from("orders").update(values).eq("id", o.id);
    if (error) {
      toast({ title: "No se pudo actualizar", description: errorMessage(error), tone: "error" });
      void load();
    } else toast({ title: `Pedido ${o.order_number} actualizado` });
  };

  const visible = (orders ?? []).filter((o) => filter === "todos" || o.status === filter);

  return (
    <>
      <AdminHeader title="Pedidos" description="Revisa y actualiza el estado de cada pedido." />
      <div className="no-scrollbar -mx-4 mb-4 flex gap-2 overflow-x-auto px-4" role="group" aria-label="Filtrar por estado">
        {["todos", ...Object.keys(orderStatusLabel.status)].map((s) => (
          <button key={s} type="button" className="chip shrink-0" aria-pressed={filter === s} onClick={() => setFilter(s)}>
            {s === "todos" ? "Todos" : orderStatusLabel.status[s as OrderRow["status"]]}
            {orders && <span className="opacity-60">{s === "todos" ? orders.length : orders.filter((o) => o.status === s).length}</span>}
          </button>
        ))}
      </div>

      {orders === null ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton h-20 rounded-3xl" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <p className="rounded-3xl bg-white p-12 text-center text-ink-soft shadow-[var(--shadow-soft)]">No hay pedidos en este estado.</p>
      ) : (
        <ul className="space-y-3">
          {visible.map((o) => {
            const expanded = open === o.id;
            const c = o.customer;
            return (
              <li key={o.id} className="overflow-hidden rounded-3xl bg-white shadow-[var(--shadow-soft)]">
                <button type="button" onClick={() => setOpen(expanded ? null : o.id)} aria-expanded={expanded} className="flex w-full flex-wrap items-center gap-x-6 gap-y-2 p-5 text-left">
                  <span className="min-w-36">
                    <span className="block font-semibold">{o.order_number}</span>
                    <span className="text-sm text-ink-soft">{new Date(o.created_at).toLocaleString("es-CL", { dateStyle: "medium", timeStyle: "short" })}</span>
                  </span>
                  <span className="min-w-40 flex-1 text-sm">
                    {c ? `${c.first_name} ${c.last_name}` : "—"}
                    <span className="block text-ink-soft">{c?.comuna}</span>
                  </span>
                  <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", STATUS_COLORS[o.status])}>{orderStatusLabel.status[o.status]}</span>
                  <span className="text-xs font-medium text-ink-soft">{orderStatusLabel.payment[o.payment_status]}</span>
                  <span className="font-semibold tabular-nums">{formatCLP(o.total)}</span>
                  <Icon name="down" size={18} className={cn("transition-transform", expanded && "rotate-180")} />
                </button>

                {expanded && (
                  <div className="grid gap-6 border-t border-line p-5 lg:grid-cols-3">
                    <div className="lg:col-span-2">
                      <h3 className="text-sm font-semibold uppercase tracking-wider text-ink-soft">Productos</h3>
                      <ul className="mt-3 divide-y divide-line">
                        {o.order_items.map((i) => (
                          <li key={i.id} className="flex justify-between gap-4 py-3 text-sm">
                            <span>
                              <span className="font-medium">
                                {i.quantity} × {i.product_name}
                              </span>
                              {i.variant_name && <span className="block text-ink-soft">{i.variant_name}</span>}
                              {i.customization_data && (
                                <span className="mt-2 block space-y-1 rounded-xl bg-paper p-3">
                                  {i.customization_data.name && <span className="block">Nombre: “{i.customization_data.name}”</span>}
                                  {i.customization_data.text && <span className="block">Texto: “{i.customization_data.text}”</span>}
                                  {i.customization_data.image_path && <CustomImage path={i.customization_data.image_path} />}
                                </span>
                              )}
                            </span>
                            <span className="font-semibold tabular-nums">{formatCLP(i.unit_price * i.quantity)}</span>
                          </li>
                        ))}
                      </ul>
                      {o.notes && <p className="mt-3 rounded-xl bg-m-yellow/10 p-3 text-sm">Notas: {o.notes}</p>}
                    </div>
                    <div className="space-y-4">
                      {c && (
                        <div className="text-sm">
                          <h3 className="font-semibold uppercase tracking-wider text-ink-soft">Cliente</h3>
                          <p className="mt-2">
                            {c.first_name} {c.last_name}
                          </p>
                          <p className="break-all text-ink-soft">{c.email}</p>
                          <p className="text-ink-soft">{c.phone}</p>
                          <p className="mt-1 text-ink-soft">
                            {c.address}, {c.comuna}, {c.region}
                          </p>
                          <a
                            href={waTo(c.phone, `Hola ${c.first_name} 👋 Te escribimos de Minerva por tu pedido ${o.order_number}.`)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-wa mt-3 w-full"
                          >
                            <WhatsAppIcon /> Escribir al cliente
                          </a>
                        </div>
                      )}
                      {(
                        [
                          ["status", "Estado", orderStatusLabel.status],
                          ["payment_status", "Pago", orderStatusLabel.payment],
                          ["delivery_status", "Despacho", orderStatusLabel.delivery],
                        ] as const
                      ).map(([key, label, options]) => (
                        <div key={key}>
                          <label htmlFor={`${o.id}-${key}`} className="label">
                            {label}
                          </label>
                          <select id={`${o.id}-${key}`} className="field" value={o[key]} onChange={(e) => update(o, { [key]: e.target.value } as Partial<OrderRow>)}>
                            {Object.entries(options).map(([v, l]) => (
                              <option key={v} value={v}>
                                {l}
                              </option>
                            ))}
                          </select>
                        </div>
                      ))}
                      <div>
                        <label htmlFor={`${o.id}-tracking`} className="label">
                          Nº de seguimiento Paket
                        </label>
                        <input
                          id={`${o.id}-tracking`}
                          key={o.tracking_code ?? ""}
                          className="field"
                          maxLength={60}
                          autoComplete="off"
                          placeholder="Pega aquí el código de Paket"
                          defaultValue={o.tracking_code ?? ""}
                          onBlur={(e) => {
                            const code = e.target.value.trim() || null;
                            if (code !== o.tracking_code) void update(o, { tracking_code: code });
                          }}
                          onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                        />
                        <p className="mt-1 text-xs text-ink-soft">Se muestra al cliente en /seguimiento cuando el despacho está en “Enviado”.</p>
                      </div>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
