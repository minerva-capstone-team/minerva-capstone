"use client";
import { useEffect, useMemo, useState } from "react";
import { adminDb } from "@/lib/admin";
import { formatCLP } from "@/lib/format";
import { REGIONS } from "@/lib/regions";
import { orderStatusLabel } from "@/lib/order-status";
import { AdminHeader } from "@/components/admin/AdminShell";
import { ChartCard, HBars, RangePicker, StatTile, VBars, VIZ } from "@/components/admin/charts";

interface Row {
  created_at: string;
  total: number;
  discount: number;
  coupon_code: string | null;
  status: keyof typeof orderStatusLabel.status;
  customer: { region: string } | null;
  order_items: { product_name: string; quantity: number; unit_price: number }[];
}

const SHORT: Record<string, string> = {
  "Arica y Parinacota": "Arica y Parinacota", "Metropolitana de Santiago": "Metropolitana", "Libertador General Bernardo O'Higgins": "O'Higgins",
  "Aysén del General Carlos Ibáñez del Campo": "Aysén", "Magallanes y de la Antártica Chilena": "Magallanes",
};
const short = (r: string) => SHORT[r] ?? r;
const kCLP = (n: number) => (n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1).replace(".", ",")} M` : n >= 1000 ? `$${Math.round(n / 1000)} mil` : formatCLP(n));

export default function Metrics() {
  const [days, setDays] = useState(30);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setRows(null);
    const since = new Date(Date.now() - days * 86_400_000).toISOString();
    adminDb()
      .from("orders")
      .select("created_at,total,discount,coupon_code,status,customer:customers(region),order_items(product_name,quantity,unit_price)")
      .gte("created_at", since)
      .order("created_at")
      .limit(3000)
      .then(({ data, error }) => {
        if (error) return setError(error.message);
        setRows((data ?? []) as unknown as Row[]);
      });
  }, [days]);

  const m = useMemo(() => {
    if (!rows) return null;
    const valid = rows.filter((r) => r.status !== "cancelado");
    const revenue = valid.reduce((n, r) => n + Number(r.total), 0);
    const avg = valid.length ? revenue / valid.length : 0;
    const discount = valid.reduce((n, r) => n + Number(r.discount ?? 0), 0);

    // Serie temporal: por día (≤ 30 días) o por semana (90 días).
    const bucketDays = days > 30 ? 7 : 1;
    const nBuckets = Math.ceil(days / bucketDays);
    const start = new Date(); start.setHours(0, 0, 0, 0); start.setDate(start.getDate() - (nBuckets * bucketDays - 1));
    const series = Array<number>(nBuckets).fill(0);
    for (const r of valid) {
      const i = Math.floor((new Date(r.created_at).getTime() - start.getTime()) / (bucketDays * 86_400_000));
      if (i >= 0 && i < nBuckets) series[i] += Number(r.total);
    }
    const bucketDate = (i: number) => new Date(start.getTime() + i * bucketDays * 86_400_000);
    const labels = series.map((_, i) => bucketDate(i).toLocaleDateString("es-CL", { day: "numeric", month: "numeric" }));

    const prod = new Map<string, { units: number; revenue: number }>();
    for (const r of valid) for (const i of r.order_items) {
      const p = prod.get(i.product_name) ?? { units: 0, revenue: 0 };
      p.units += i.quantity; p.revenue += i.quantity * i.unit_price;
      prod.set(i.product_name, p);
    }
    const top = [...prod.entries()].sort((a, b) => b[1].revenue - a[1].revenue).slice(0, 8).map(([label, p]) => ({ label, values: [p.revenue] }));

    const region = new Map<string, { orders: number; revenue: number }>();
    for (const r of valid) {
      const k = r.customer?.region ?? "Sin región";
      const g = region.get(k) ?? { orders: 0, revenue: 0 };
      g.orders++; g.revenue += Number(r.total);
      region.set(k, g);
    }
    const maxRegion = Math.max(1, ...[...region.values()].map((g) => g.revenue));

    const coupons = new Map<string, { uses: number; discount: number }>();
    for (const r of valid) if (r.coupon_code) {
      const c = coupons.get(r.coupon_code) ?? { uses: 0, discount: 0 };
      c.uses++; c.discount += Number(r.discount ?? 0);
      coupons.set(r.coupon_code, c);
    }

    const byStatus = Object.keys(orderStatusLabel.status).map((s) => ({ label: orderStatusLabel.status[s as Row["status"]], values: [rows.filter((r) => r.status === s).length] }));
    const cancelRate = rows.length ? rows.filter((r) => r.status === "cancelado").length / rows.length : 0;

    return { valid, revenue, avg, discount, series, labels, bucketDays, bucketDate, top, region, maxRegion, coupons, byStatus, cancelRate };
  }, [rows, days]);

  return (
    <>
      <AdminHeader title="Métricas" description="Cómo va la tienda: ventas, productos, regiones y cupones." action={<RangePicker value={days} onChange={setDays} />} />
      {error && <p className="rounded-2xl bg-m-red/10 p-4 text-m-red">{error}</p>}
      {!m && !error && <div className="skeleton h-96 rounded-3xl" />}
      {m && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile label="Ventas" value={formatCLP(m.revenue)} hint={`${m.valid.length} pedidos (sin cancelados)`} />
            <StatTile label="Ticket promedio" value={formatCLP(Math.round(m.avg))} />
            <StatTile label="Descuentos entregados" value={formatCLP(m.discount)} hint={`${m.coupons.size} cupón(es) usados`} />
            <StatTile label="Pedidos cancelados" value={`${Math.round(m.cancelRate * 100)}%`} hint="Incluye reservas vencidas sin pago" />
          </div>

          <ChartCard title={m.bucketDays === 1 ? "Ventas por día" : "Ventas por semana"} subtitle="Total de pedidos no cancelados (incluye envío).">
            <VBars
              values={m.series}
              labels={m.labels}
              format={formatCLP}
              tipLabel={(i) => (m.bucketDays === 1 ? m.bucketDate(i).toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long" }) : `Semana del ${m.labels[i]}`)}
              tickEvery={m.series.length > 14 ? Math.ceil(m.series.length / 8) : 1}
              height={190}
            />
          </ChartCard>

          <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <ChartCard title="Productos que más venden" subtitle="Por ingresos en el período.">
              <HBars rows={m.top} series={[{ name: "Ingresos", color: VIZ.s1 }]} format={kCLP} />
            </ChartCard>
            <ChartCard title="Estado de los pedidos" subtitle="Todos los pedidos del período.">
              <HBars rows={m.byStatus} series={[{ name: "Pedidos", color: VIZ.s1 }]} />
            </ChartCard>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
            <ChartCard title="Ventas por región" subtitle="De norte a sur · más oscuro, más ventas.">
              <ul className="space-y-[3px]">
                {REGIONS.map((r) => {
                  const g = m.region.get(r);
                  const step = g ? Math.min(VIZ.seq.length - 1, 2 + Math.round((g.revenue / m.maxRegion) * (VIZ.seq.length - 3))) : -1;
                  return (
                    <li key={r} className="grid grid-cols-[7.5rem_1fr_auto] items-center gap-3 text-sm" title={g ? `${r}: ${g.orders} pedidos · ${formatCLP(g.revenue)}` : `${r}: sin ventas`}>
                      <span className="truncate text-ink-2">{short(r)}</span>
                      <span className="h-5 rounded-[4px]" style={{ background: step >= 0 ? VIZ.seq[step] : "#f0efec" }} />
                      <span className="w-20 text-right text-xs tabular-nums text-ink-2">{g ? kCLP(g.revenue) : "—"}</span>
                    </li>
                  );
                })}
              </ul>
            </ChartCard>
            <ChartCard title="Cupones" subtitle="Usos y descuento entregado en pedidos no cancelados.">
              {m.coupons.size === 0 ? (
                <p className="py-6 text-center text-sm text-ink-soft">No se usaron cupones en este período.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wider text-ink-soft"><th className="pb-2">Código</th><th className="pb-2 text-right">Usos</th><th className="pb-2 text-right">Descuento</th></tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {[...m.coupons.entries()].sort((a, b) => b[1].uses - a[1].uses).map(([code, c]) => (
                      <tr key={code}><td className="py-2.5 font-mono font-semibold">{code}</td><td className="py-2.5 text-right tabular-nums">{c.uses}</td><td className="py-2.5 text-right tabular-nums">{formatCLP(c.discount)}</td></tr>
                    ))}
                  </tbody>
                </table>
              )}
            </ChartCard>
          </div>
        </div>
      )}
    </>
  );
}
