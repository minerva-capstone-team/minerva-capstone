"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { adminDb } from "@/lib/admin";
import { cn } from "@/lib/format";
import { addBusinessDays } from "@/lib/production";
import { AdminHeader } from "@/components/admin/AdminShell";

interface Product {
  id: string;
  name: string;
  slug: string;
  stock: number;
}

interface CommercialDate {
  name: string;
  /** Fecha del evento para un año dado. */
  date: (year: number) => Date;
  /** Días hábiles antes para empezar a preparar (producción + campaña). */
  leadDays: number;
  idea: string;
  /** Palabras para sugerir productos del catálogo. */
  keywords: RegExp;
  coupon: string;
}

/** n-ésimo domingo de un mes (mes 0-11). */
function nthSunday(year: number, month: number, n: number) {
  const first = new Date(year, month, 1);
  const offset = (7 - first.getDay()) % 7;
  return new Date(year, month, 1 + offset + (n - 1) * 7);
}

const DATES: CommercialDate[] = [
  { name: "San Valentín", date: (y) => new Date(y, 1, 14), leadDays: 15, idea: "Tazas y cojines de pareja con foto o fecha especial.", keywords: /taza|cojin|cojín|pareja|amor|coraz/i, coupon: "AMOR" },
  { name: "Regreso a clases", date: (y) => new Date(y, 2, 2), leadDays: 15, idea: "Estuches, botellas y bolsos con nombre para el colegio.", keywords: /estuche|botella|bolso|mochila|libreta|cuaderno/i, coupon: "CLASES" },
  { name: "Día de la Mujer", date: (y) => new Date(y, 2, 8), leadDays: 10, idea: "Regalos corporativos y detalles personalizados.", keywords: /taza|bolsa|tote|libreta/i, coupon: "MUJER" },
  { name: "Día de la Madre", date: (y) => nthSunday(y, 4, 2), leadDays: 20, idea: "La fecha más fuerte: tazas, cojines y cuadros con foto familiar.", keywords: /taza|cojin|cojín|cuadro|mam/i, coupon: "MAMA" },
  { name: "Día del Padre", date: (y) => nthSunday(y, 5, 3), leadDays: 15, idea: "Tazas, poleras y llaveros con frases o foto.", keywords: /taza|polera|llavero|pap/i, coupon: "PAPA" },
  { name: "Día del Niño", date: (y) => nthSunday(y, 7, 2), leadDays: 15, idea: "Poleras y botellas con personajes o el nombre del niño.", keywords: /polera|botella|niñ|infantil/i, coupon: "NINOS" },
  { name: "Fiestas Patrias", date: (y) => new Date(y, 8, 18), leadDays: 15, idea: "Productos con motivo dieciochero y regalos para empresas.", keywords: /polera|taza|chile|diecioch/i, coupon: "DIECIOCHO" },
  { name: "Día del Profesor", date: (y) => new Date(y, 9, 16), leadDays: 12, idea: "Tazas y libretas de agradecimiento con nombre del curso.", keywords: /taza|libreta|profe/i, coupon: "PROFE" },
  { name: "Halloween", date: (y) => new Date(y, 9, 31), leadDays: 10, idea: "Poleras y bolsas para dulces con diseño de temporada.", keywords: /polera|bolsa|tote/i, coupon: "HALLOWEEN" },
  { name: "Licenciaturas", date: (y) => new Date(y, 11, 5), leadDays: 25, idea: "Pedidos por curso: poleras, tazas y recuerdos con nombres.", keywords: /polera|taza|licenci|graduaci/i, coupon: "LICENCIATURA" },
  { name: "Navidad", date: (y) => new Date(y, 11, 25), leadDays: 25, idea: "Cierre del año: regalos con foto, tazas y cojines.", keywords: /taza|cojin|cojín|navid|cuadro/i, coupon: "NAVIDAD" },
];

const DAY = 86_400_000;
const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

/** Días hábiles hacia atrás desde una fecha. */
function subtractBusinessDays(date: Date, days: number) {
  const d = new Date(date);
  let left = days;
  while (left > 0) {
    d.setDate(d.getDate() - 1);
    if (d.getDay() !== 0 && d.getDay() !== 6) left--;
  }
  return d;
}

export default function AdminCalendar() {
  const [products, setProducts] = useState<Product[] | null>(null);

  useEffect(() => {
    adminDb()
      .from("products")
      .select("id, name, slug, stock")
      .eq("active", true)
      .then(({ data }) => setProducts((data as Product[]) ?? []));
  }, []);

  const upcoming = useMemo(() => {
    const today = startOfToday();
    const y = today.getFullYear();
    return DATES.map((c) => {
      let date = c.date(y);
      if (date < today) date = c.date(y + 1);
      const prepFrom = subtractBusinessDays(date, c.leadDays);
      const days = Math.round((date.getTime() - today.getTime()) / DAY);
      return { ...c, when: date, prepFrom, days, preparing: today >= prepFrom };
    }).sort((a, b) => a.when.getTime() - b.when.getTime());
  }, []);

  const fmt = (d: Date) => d.toLocaleDateString("es-CL", { weekday: "short", day: "numeric", month: "long" });
  const next = upcoming[0];
  // Último día para recibir pedidos hoy: lo que entre ahora estaría listo en ~5 días hábiles.
  const readyIfOrderedToday = addBusinessDays(startOfToday(), 5);

  return (
    <>
      <AdminHeader title="Calendario comercial" description="Fechas fuertes del año en Chile y cuándo empezar a preparar cada campaña." />

      {next && (
        <section className="mb-6 rounded-3xl bg-ink p-6 text-white shadow-[var(--shadow-soft)] sm:p-8">
          <p className="text-sm text-white/70">Próxima fecha</p>
          <h2 className="display mt-1 text-3xl">{next.name}</h2>
          <p className="mt-1 text-white/80">
            {fmt(next.when)} · faltan <strong className="tabular-nums">{next.days}</strong> días
          </p>
          <p className="mt-4 max-w-xl text-sm text-white/80">{next.idea}</p>
          <p className="mt-2 text-xs text-white/60">Un pedido que entra hoy estaría listo aprox. el {fmt(readyIfOrderedToday)}.</p>
        </section>
      )}

      <ol className="grid gap-3 sm:grid-cols-2">
        {upcoming.map((c) => {
          const code = `${c.coupon}${String(c.when.getFullYear()).slice(2)}`;
          const vence = `${c.when.getFullYear()}-${String(c.when.getMonth() + 1).padStart(2, "0")}-${String(c.when.getDate()).padStart(2, "0")}`;
          const suggested = (products ?? []).filter((p) => c.keywords.test(p.name)).slice(0, 4);
          return (
            <li key={c.name} className={cn("rounded-3xl bg-white p-5 shadow-[var(--shadow-soft)]", c.preparing && "ring-2 ring-m-yellow")}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold">{c.name}</h3>
                  <p className="text-sm text-ink-soft">{fmt(c.when)}</p>
                </div>
                <span className="shrink-0 rounded-full bg-paper-2 px-3 py-1 text-sm font-semibold tabular-nums">{c.days} días</span>
              </div>
              <p className={cn("mt-3 rounded-xl px-3 py-2 text-sm", c.preparing ? "bg-m-yellow/20 text-[#8a5a00]" : "bg-paper-2 text-ink-2")}>
                {c.preparing ? "Es momento de preparar: " : "Preparar desde "}
                <strong>{fmt(c.prepFrom)}</strong>
              </p>
              <p className="mt-3 text-sm text-ink-2">{c.idea}</p>
              {products === null ? (
                <span className="skeleton mt-3 block h-6 rounded-lg" />
              ) : suggested.length > 0 ? (
                <ul className="mt-3 flex flex-wrap gap-1.5">
                  {suggested.map((p) => (
                    <li key={p.id} className={cn("rounded-full px-2.5 py-1 text-xs", p.stock <= 5 ? "bg-m-red/10 text-m-red" : "bg-paper-2 text-ink-2")}>
                      {p.name}
                      {p.stock <= 5 && ` · stock ${p.stock}`}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-xs text-ink-soft">No hay productos del catálogo que calcen con esta fecha.</p>
              )}
              <Link href={`/admin/cupones?nuevo=${code}&vence=${vence}`} className="btn btn-ghost mt-4 h-10 w-full text-sm">
                Crear cupón {code}
              </Link>
            </li>
          );
        })}
      </ol>
      <p className="mt-6 text-xs text-ink-soft">Las fechas móviles (Día de la Madre, del Padre y del Niño) se calculan solas cada año. Regreso a clases y licenciaturas son aproximadas.</p>
    </>
  );
}
