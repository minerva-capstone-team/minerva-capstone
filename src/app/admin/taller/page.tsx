"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { adminDb, errorMessage } from "@/lib/admin";
import { cn } from "@/lib/format";
import { DUE_STYLE, dueInfo } from "@/lib/production";
import { toast } from "@/lib/stores";
import { UPLOADS_BUCKET } from "@/lib/supabase/config";
import { AdminHeader } from "@/components/admin/AdminShell";
import { Icon } from "@/components/ui/Icon";

interface Item {
  quantity: number;
  product_name: string;
  variant_name: string | null;
  customization_data: { text?: string | null; name?: string | null; image_path?: string | null } | null;
  product: { preparation_days: number } | null;
}
interface Order {
  id: string;
  order_number: string;
  created_at: string;
  status: string;
  notes: string | null;
  gift_code: string | null;
  customer: { first_name: string; last_name: string } | null;
  order_items: Item[];
}

const STATUSES = [
  { id: "confirmado", label: "Confirmados" },
  { id: "en_produccion", label: "En producción" },
  { id: "pendiente", label: "Por confirmar" },
];

function Thumb({ path }: { path: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    adminDb().storage.from(UPLOADS_BUCKET).createSignedUrl(path, 3600).then(({ data }) => setUrl(data?.signedUrl ?? null));
  }, [path]);
  // eslint-disable-next-line @next/next/no-img-element
  return url ? <img src={url} alt="Imagen de la clienta" className="size-16 rounded-lg object-cover ring-1 ring-line" /> : <span className="inline-block size-16 rounded-lg bg-paper-2" />;
}

export default function Workshop() {
  const [statuses, setStatuses] = useState<string[]>(["confirmado", "en_produccion"]);
  const [orders, setOrders] = useState<Order[] | null>(null);

  useEffect(() => {
    setOrders(null);
    adminDb()
      .from("orders")
      .select("id,order_number,created_at,status,notes,gift_code,customer:customers(first_name,last_name),order_items(quantity,product_name,variant_name,customization_data,product:products(preparation_days))")
      .in("status", statuses.length ? statuses : ["__ninguno__"])
      .order("created_at")
      .then(({ data, error }) => {
        if (error) toast({ title: "Error al cargar", description: errorMessage(error), tone: "error" });
        setOrders((data ?? []) as unknown as Order[]);
      });
  }, [statuses]);

  // Agrupa por producto + variante: "qué hay que estampar".
  const groups = useMemo(() => {
    const map = new Map<string, { product: string; variant: string | null; units: number; lines: { order: Order; item: Item; due: ReturnType<typeof dueInfo> }[] }>();
    for (const o of orders ?? []) {
      const due = dueInfo(o.created_at, o.order_items.map((i) => i.product?.preparation_days ?? 3), o.status);
      for (const item of o.order_items) {
        const key = `${item.product_name}__${item.variant_name ?? ""}`;
        const g = map.get(key) ?? { product: item.product_name, variant: item.variant_name, units: 0, lines: [] };
        g.units += item.quantity;
        g.lines.push({ order: o, item, due });
        map.set(key, g);
      }
    }
    return [...map.values()].sort((a, b) => b.units - a.units);
  }, [orders]);
  const gifts = (orders ?? []).filter((o) => o.gift_code);

  return (
    <>
      <div className="print:hidden">
        <AdminHeader
          title="Hoja de taller"
          description="Lo que hay que estampar, agrupado por producto, con los datos de personalización de cada pedido."
          action={
            <button type="button" className="btn btn-primary" onClick={() => window.print()}>
              <Icon name="receipt" size={18} /> Imprimir
            </button>
          }
        />
        <div className="mb-6 flex flex-wrap gap-2" role="group" aria-label="Estados incluidos">
          {STATUSES.map((s) => (
            <button key={s.id} type="button" className="chip" aria-pressed={statuses.includes(s.id)} onClick={() => setStatuses((cur) => (cur.includes(s.id) ? cur.filter((x) => x !== s.id) : [...cur, s.id]))}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="hidden print:block print:mb-4">
        <h1 className="text-2xl font-bold">Hoja de taller · Minerva</h1>
        <p className="text-sm">Impresa el {new Date().toLocaleString("es-CL", { dateStyle: "long", timeStyle: "short" })}</p>
      </div>

      {!orders ? (
        <div className="skeleton h-96 rounded-3xl" />
      ) : groups.length === 0 ? (
        <p className="rounded-3xl bg-white p-10 text-center text-ink-soft shadow-[var(--shadow-soft)]">No hay pedidos en los estados seleccionados.</p>
      ) : (
        <div className="space-y-5">
          {groups.map((g) => (
            <section key={`${g.product}-${g.variant}`} className="break-inside-avoid rounded-3xl bg-white p-5 shadow-[var(--shadow-soft)] print:rounded-none print:border print:border-black/20 print:shadow-none">
              <header className="mb-3 flex items-baseline justify-between gap-3 border-b border-line pb-3">
                <h2 className="display text-xl">
                  {g.product}
                  {g.variant && <span className="text-ink-soft"> · {g.variant}</span>}
                </h2>
                <span className="display text-2xl tabular-nums">{g.units} u.</span>
              </header>
              <ul className="divide-y divide-line">
                {g.lines.map(({ order, item, due }, i) => (
                  <li key={`${order.id}-${i}`} className="flex gap-4 py-3">
                    <span className="mt-1 size-5 shrink-0 rounded border-2 border-ink/40" aria-hidden />
                    <div className="min-w-0 flex-1 text-sm">
                      <p className="flex flex-wrap items-center gap-2">
                        <b>{item.quantity} ×</b>
                        <Link href={`/admin/pedidos?pedido=${order.order_number}`} className="font-semibold hover:underline print:no-underline">
                          {order.order_number}
                        </Link>
                        <span className="text-ink-soft">{order.customer ? `${order.customer.first_name} ${order.customer.last_name}` : ""}</span>
                        <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold print:border print:border-black/30", DUE_STYLE[due.state])}>{due.label} · {due.due.toLocaleDateString("es-CL")}</span>
                        {order.gift_code && <span className="rounded-full bg-m-magenta/12 px-2 py-0.5 text-[11px] font-semibold text-[#a3205d]">+ tarjeta de regalo</span>}
                      </p>
                      {item.customization_data && (item.customization_data.name || item.customization_data.text) && (
                        <p className="mt-1.5 rounded-lg bg-paper px-3 py-2 text-ink">
                          {item.customization_data.name && <>Nombre: <b>“{item.customization_data.name}”</b>{"  "}</>}
                          {item.customization_data.text && <>Texto: <b>“{item.customization_data.text}”</b></>}
                        </p>
                      )}
                      {order.notes && <p className="mt-1 text-xs text-ink-soft">Notas: {order.notes}</p>}
                    </div>
                    {item.customization_data?.image_path && <Thumb path={item.customization_data.image_path} />}
                  </li>
                ))}
              </ul>
            </section>
          ))}

          {gifts.length > 0 && (
            <section className="break-inside-avoid rounded-3xl bg-white p-5 shadow-[var(--shadow-soft)] print:rounded-none print:border print:border-black/20 print:shadow-none">
              <h2 className="display text-xl">Tarjetas de regalo por imprimir</h2>
              <ul className="mt-3 flex flex-wrap gap-2">
                {gifts.map((o) => (
                  <li key={o.id}>
                    <Link href={`/admin/regalo/${o.id}`} className="chip">
                      {o.order_number} · imprimir tarjeta
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </>
  );
}
