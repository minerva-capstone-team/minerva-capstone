"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { adminDb, errorMessage, notifyCustomer } from "@/lib/admin";
import { cn } from "@/lib/format";
import { orderStatusLabel } from "@/lib/order-status";
import { DUE_ICON, DUE_STYLE, PROOF_LABEL, dueInfo } from "@/lib/production";
import { toast } from "@/lib/stores";
import type { OrderStatus } from "@/lib/types";
import { AdminHeader } from "@/components/admin/AdminShell";
import { Icon } from "@/components/ui/Icon";

interface Card {
  id: string;
  order_number: string;
  created_at: string;
  status: OrderStatus;
  document_type: "boleta" | "factura";
  gift_code: string | null;
  customer: { first_name: string; last_name: string; comuna: string } | null;
  order_items: { quantity: number; product_name: string; variant_name: string | null; customization_data: unknown; product: { preparation_days: number } | null }[];
  design_proofs: { status: string; version: number }[];
}

const COLUMNS: { status: OrderStatus; title: string; hint: string }[] = [
  { status: "pendiente", title: "Por confirmar", hint: "Pago y detalles por coordinar" },
  { status: "confirmado", title: "Confirmado", hint: "Listo para empezar" },
  { status: "en_produccion", title: "En producción", hint: "Estampando y armando" },
  { status: "listo", title: "Listo", hint: "Embalado para despacho" },
  { status: "entregado", title: "Entregado", hint: "Últimos 14 días" },
];

export default function ProductionBoard() {
  const [cards, setCards] = useState<Card[] | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<OrderStatus | null>(null);

  const load = useCallback(async () => {
    const since = new Date(Date.now() - 14 * 86_400_000).toISOString();
    const { data, error } = await adminDb()
      .from("orders")
      .select("id,order_number,created_at,status,document_type,gift_code,customer:customers(first_name,last_name,comuna),order_items(quantity,product_name,variant_name,customization_data,product:products(preparation_days)),design_proofs(status,version)")
      .neq("status", "cancelado")
      .or(`status.neq.entregado,created_at.gte.${since}`)
      .order("created_at")
      .limit(300);
    if (error) toast({ title: "Error al cargar", description: errorMessage(error), tone: "error" });
    setCards((data ?? []) as unknown as Card[]);
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const move = async (card: Card, status: OrderStatus) => {
    if (card.status === status) return;
    setCards((list) => list?.map((c) => (c.id === card.id ? { ...c, status } : c)) ?? null);
    const { error } = await adminDb().from("orders").update({ status }).eq("id", card.id);
    if (error) {
      toast({ title: "No se pudo mover", description: errorMessage(error), tone: "error" });
      return void load();
    }
    const res = await notifyCustomer(card.id, "status");
    toast({ title: `${card.order_number} → ${orderStatusLabel.status[status]}`, description: res.sent ? "Se avisó a la clienta por correo." : undefined });
  };

  const enriched = useMemo(
    () =>
      (cards ?? []).map((c) => {
        const latestProof = [...c.design_proofs].sort((a, b) => b.version - a.version).find((p) => p.status !== "reemplazado");
        return { ...c, due: dueInfo(c.created_at, c.order_items.map((i) => i.product?.preparation_days ?? 3), c.status), proof: latestProof?.status };
      }),
    [cards],
  );
  const late = enriched.filter((c) => c.due.state === "late").length;
  const today = enriched.filter((c) => c.due.state === "today").length;

  return (
    <>
      <AdminHeader
        title="Producción"
        description="Arrastra cada pedido a su etapa. La fecha comprometida usa los días hábiles de preparación de cada producto."
        action={
          <Link href="/admin/taller" className="btn btn-ghost">
            <Icon name="receipt" size={18} /> Hoja de taller
          </Link>
        }
      />
      <div className="mb-5 flex flex-wrap gap-3 text-sm">
        <span className={cn("rounded-full px-3 py-1.5 font-semibold", DUE_STYLE.late)}>{DUE_ICON.late} {late} atrasado{late === 1 ? "" : "s"}</span>
        <span className={cn("rounded-full px-3 py-1.5 font-semibold", DUE_STYLE.today)}>{DUE_ICON.today} {today} vence{today === 1 ? "" : "n"} hoy</span>
        <span className="rounded-full bg-white px-3 py-1.5 text-ink-2 shadow-[var(--shadow-soft)]">{enriched.filter((c) => c.status === "en_produccion").length} en producción</span>
      </div>

      {!cards ? (
        <div className="skeleton h-96 rounded-3xl" />
      ) : (
        <div className="no-scrollbar -mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-4">
          {COLUMNS.map((col, ci) => {
            const list = enriched.filter((c) => c.status === col.status);
            return (
              <section
                key={col.status}
                aria-label={col.title}
                onDragOver={(e) => {
                  e.preventDefault();
                  setOver(col.status);
                }}
                onDragLeave={() => setOver((o) => (o === col.status ? null : o))}
                onDrop={(e) => {
                  e.preventDefault();
                  setOver(null);
                  const card = enriched.find((c) => c.id === e.dataTransfer.getData("text/plain"));
                  if (card) void move(card, col.status);
                }}
                className={cn("flex w-72 shrink-0 snap-start flex-col rounded-3xl bg-paper-2/70 p-3 transition-colors", over === col.status && dragging && "bg-m-blue/10 ring-2 ring-m-blue/40")}
              >
                <header className="mb-3 px-2 pt-1">
                  <div className="flex items-center justify-between">
                    <h2 className="font-semibold">{col.title}</h2>
                    <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-ink-2">{list.length}</span>
                  </div>
                  <p className="text-xs text-ink-soft">{col.hint}</p>
                </header>
                <ul className="flex min-h-24 flex-1 flex-col gap-2.5">
                  {list.map((c) => {
                    const units = c.order_items.reduce((n, i) => n + i.quantity, 0);
                    const custom = c.order_items.some((i) => i.customization_data);
                    return (
                      <li
                        key={c.id}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData("text/plain", c.id);
                          setDragging(c.id);
                        }}
                        onDragEnd={() => setDragging(null)}
                        className={cn("cursor-grab rounded-2xl bg-white p-3.5 shadow-[var(--shadow-soft)] active:cursor-grabbing", dragging === c.id && "opacity-50")}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <Link href={`/admin/pedidos?pedido=${c.order_number}`} className="font-semibold hover:underline">
                            {c.order_number}
                          </Link>
                          <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", DUE_STYLE[c.due.state])} title={`Fecha comprometida: ${c.due.due.toLocaleDateString("es-CL")}`}>
                            {DUE_ICON[c.due.state]} {c.due.label}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-ink-2">
                          {c.customer ? `${c.customer.first_name} ${c.customer.last_name}` : "—"}
                          <span className="text-ink-soft"> · {c.customer?.comuna}</span>
                        </p>
                        <p className="mt-1.5 line-clamp-2 text-xs text-ink-soft">
                          {c.order_items.map((i) => `${i.quantity}× ${i.product_name}${i.variant_name ? ` (${i.variant_name})` : ""}`).join(" · ")}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-semibold">
                          <span className="rounded-full bg-paper px-2 py-0.5 text-ink-2">{units} u.</span>
                          {custom && <span className="rounded-full bg-m-violet/12 px-2 py-0.5 text-m-violet">Personalizado</span>}
                          {c.proof && PROOF_LABEL[c.proof] && <span className={cn("rounded-full px-2 py-0.5", PROOF_LABEL[c.proof].cls)}>{PROOF_LABEL[c.proof].text}</span>}
                          {c.gift_code && <span className="rounded-full bg-m-magenta/12 px-2 py-0.5 text-[#a3205d]">Regalo con mensaje</span>}
                          {c.document_type === "factura" && <span className="rounded-full bg-m-yellow/20 px-2 py-0.5 text-[#8a5a00]">Factura</span>}
                        </div>
                        <div className="mt-2.5 flex justify-between">
                          <button type="button" disabled={ci === 0} onClick={() => move(c, COLUMNS[ci - 1].status)} className="rounded-full px-2 py-1 text-xs text-ink-soft hover:bg-paper disabled:invisible" aria-label={`Mover ${c.order_number} a ${COLUMNS[ci - 1]?.title}`}>
                            ← {COLUMNS[ci - 1]?.title}
                          </button>
                          <button type="button" disabled={ci === COLUMNS.length - 1} onClick={() => move(c, COLUMNS[ci + 1].status)} className="rounded-full px-2 py-1 text-xs font-medium text-ink hover:bg-paper disabled:invisible" aria-label={`Mover ${c.order_number} a ${COLUMNS[ci + 1]?.title}`}>
                            {COLUMNS[ci + 1]?.title} →
                          </button>
                        </div>
                      </li>
                    );
                  })}
                  {list.length === 0 && <li className="rounded-2xl border border-dashed border-line p-4 text-center text-xs text-ink-soft">Suelta aquí un pedido</li>}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}
