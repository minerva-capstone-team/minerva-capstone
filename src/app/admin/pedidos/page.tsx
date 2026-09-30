"use client";
import { useCallback, useEffect, useState } from "react";
import { adminDb, errorMessage, notifyCustomer } from "@/lib/admin";
import { UPLOADS_BUCKET } from "@/lib/supabase/config";
import { cn, formatCLP } from "@/lib/format";
import { orderStatusLabel } from "@/lib/order-status";
import { noticeFor, whatsappNotice, type NotifyKind } from "@/lib/order-notify";
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
  subtotal: number | null;
  discount: number;
  shipping_cost: number;
  shipping_pending: boolean;
  coupon_code: string | null;
  document_type: "boleta" | "factura";
  billing: { rut: string; razon_social: string; giro: string; direccion: string } | null;
  document_number: string | null;
  document_url: string | null;
  document_issued_at: string | null;
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

  const whatsappFor = (o: OrderRow) => {
    if (!o.customer) return null;
    const kind: NotifyKind = o.delivery_status === "enviado" && o.tracking_code ? "shipping" : "status";
    const notice = noticeFor(kind, o);
    return notice ? waTo(o.customer.phone, whatsappNotice(o.customer.first_name, notice, o.order_number)) : null;
  };

  /** Aviso por correo; si no hay dominio verificado, ofrece avisar por WhatsApp. */
  const notify = async (o: OrderRow, kind: NotifyKind, manual = false) => {
    const res = await notifyCustomer(o.id, kind);
    if (res.sent) return toast({ title: "Aviso enviado por correo", description: o.customer?.email });
    const wa = whatsappFor(o);
    const unavailable = res.reason === "no verified domain" || res.reason === "email not configured";
    if (res.reason === "nothing to notify") {
      if (manual) toast({ title: "No hay nada que avisar en este estado", tone: "info" });
      return;
    }
    toast({
      title: unavailable ? "El correo aún no puede escribir a clientes" : "No se pudo enviar el aviso",
      description: unavailable ? "Falta verificar un dominio en Resend." : "Inténtalo de nuevo o avisa por WhatsApp.",
      tone: unavailable ? "info" : "error",
      action: wa ? { label: "Avisar por WhatsApp", onClick: () => window.open(wa, "_blank", "noopener,noreferrer") } : undefined,
    });
  };

  const update = async (o: OrderRow, values: Partial<Pick<OrderRow, "status" | "payment_status" | "delivery_status" | "tracking_code" | "document_number" | "document_url" | "document_issued_at">>) => {
    setOrders((list) => list?.map((x) => (x.id === o.id ? { ...x, ...values } : x)) ?? null);
    const { error } = await adminDb().from("orders").update(values).eq("id", o.id);
    if (error) {
      const stock = /insufficient stock to reopen/.test(error.message);
      toast({
        title: "No se pudo actualizar",
        description: stock ? "No hay stock suficiente para reabrir este pedido." : errorMessage(error),
        tone: "error",
      });
      return void load();
    }
    toast({ title: `Pedido ${o.order_number} actualizado` });
    const next = { ...o, ...values };
    // Avisos automáticos al cliente: cambio de etapa, o salida a despacho con su código de Paket.
    if (values.status && values.status !== o.status) void notify(next, "status");
    else if (next.delivery_status === "enviado" && next.tracking_code && (values.delivery_status === "enviado" || "tracking_code" in values)) void notify(next, "shipping");
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
                  {o.document_type === "factura" && <span className="rounded-full bg-m-yellow/20 px-2.5 py-1 text-xs font-semibold text-[#8a5a00]">Factura</span>}
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
                      <dl className="mt-4 space-y-1.5 border-t border-line pt-4 text-sm">
                        <div className="flex justify-between">
                          <dt className="text-ink-soft">Subtotal</dt>
                          <dd className="tabular-nums">{formatCLP(o.subtotal ?? o.total)}</dd>
                        </div>
                        {o.discount > 0 && (
                          <div className="flex justify-between text-[#1c6b51]">
                            <dt>Descuento{o.coupon_code ? ` (${o.coupon_code})` : ""}</dt>
                            <dd className="tabular-nums">−{formatCLP(o.discount)}</dd>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <dt className="text-ink-soft">Envío</dt>
                          <dd className="tabular-nums">{o.shipping_pending ? "Por coordinar (no incluido)" : o.shipping_cost > 0 ? formatCLP(o.shipping_cost) : "Gratis"}</dd>
                        </div>
                        <div className="flex justify-between border-t border-line pt-2 font-semibold">
                          <dt>Total</dt>
                          <dd className="tabular-nums">{formatCLP(o.total)}</dd>
                        </div>
                      </dl>
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

                      <div className="rounded-2xl bg-paper p-4 text-sm">
                        <h3 className="font-semibold uppercase tracking-wider text-ink-soft">Documento: {o.document_type === "factura" ? "Factura" : "Boleta"}</h3>
                        {o.document_type === "factura" && o.billing && (
                          <p className="mt-2 text-ink-2">
                            {o.billing.razon_social}
                            <span className="block text-ink-soft">RUT {o.billing.rut}</span>
                            <span className="block text-ink-soft">Giro: {o.billing.giro}</span>
                            <span className="block text-ink-soft">{o.billing.direccion}</span>
                          </p>
                        )}
                        <label htmlFor={`${o.id}-docnum`} className="label mt-3">
                          N° del documento emitido
                        </label>
                        <input
                          id={`${o.id}-docnum`}
                          key={`n-${o.document_number ?? ""}`}
                          className="field h-11"
                          maxLength={40}
                          autoComplete="off"
                          defaultValue={o.document_number ?? ""}
                          onBlur={(e) => {
                            const v = e.target.value.trim() || null;
                            if (v !== o.document_number) void update(o, { document_number: v, document_issued_at: v ? o.document_issued_at ?? new Date().toISOString() : null });
                          }}
                          onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                        />
                        <label htmlFor={`${o.id}-docurl`} className="label mt-3">
                          Enlace al documento (PDF)
                        </label>
                        <input
                          id={`${o.id}-docurl`}
                          key={`u-${o.document_url ?? ""}`}
                          type="url"
                          className="field h-11"
                          maxLength={500}
                          placeholder="https://…"
                          defaultValue={o.document_url ?? ""}
                          onBlur={(e) => {
                            const v = e.target.value.trim() || null;
                            if (v !== o.document_url) void update(o, { document_url: v });
                          }}
                          onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                        />
                        <p className="mt-2 text-xs text-ink-soft">
                          La boleta o factura se emite con tu proveedor autorizado por el SII; aquí registras su número y enlace, que la clienta verá en /seguimiento.
                        </p>
                      </div>

                      <div className="space-y-2">
                        <button type="button" className="btn btn-ghost w-full" onClick={() => void notify(o, o.delivery_status === "enviado" && o.tracking_code ? "shipping" : "status", true)}>
                          Enviar aviso por correo
                        </button>
                        {whatsappFor(o) && (
                          <a href={whatsappFor(o)!} target="_blank" rel="noopener noreferrer" className="btn btn-wa w-full">
                            <WhatsAppIcon /> Avisar estado por WhatsApp
                          </a>
                        )}
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
