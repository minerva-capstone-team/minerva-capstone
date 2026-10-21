import { addBusinessDays, DATES, subtractBusinessDays } from "./commercial-dates";

/**
 * Días hábiles que se suman al despacho dentro de Chile (estimación, no una promesa de Paket).
 * Ajusta este número si tus envíos suelen tardar más o menos.
 */
export const SHIPPING_BUFFER_DAYS = 3;
/** Solo se muestran fechas especiales que ocurren dentro de este plazo. */
const LOOKAHEAD_DAYS = 45;
const DAY = 86_400_000;

export interface DeliveryPlan {
  /** Cuándo estaría listo para despacho si se pide hoy. */
  readyOn: Date;
  occasion: {
    name: string;
    date: Date;
    /** Último día para pedir y llegar a tiempo. */
    deadline: Date;
    daysLeft: number;
    reachable: boolean;
  } | null;
}

const startOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

/** Calcula la fecha de término y la próxima fecha especial a la que todavía se llega (o no). */
export function deliveryPlan(prepDays: number, now = new Date()): DeliveryPlan {
  const today = startOfDay(now);
  const prep = Math.max(1, prepDays);
  const readyOn = addBusinessDays(today, prep);

  const upcoming = DATES.map((c) => {
    let date = c.date(today.getFullYear());
    if (date < today) date = c.date(today.getFullYear() + 1);
    return { name: c.name, date };
  })
    .filter((o) => (o.date.getTime() - today.getTime()) / DAY <= LOOKAHEAD_DAYS)
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  const next = upcoming[0];
  if (!next) return { readyOn, occasion: null };
  const deadline = subtractBusinessDays(next.date, prep + SHIPPING_BUFFER_DAYS);
  const daysLeft = Math.round((deadline.getTime() - today.getTime()) / DAY);
  return { readyOn, occasion: { ...next, deadline, daysLeft, reachable: daysLeft >= 0 } };
}
