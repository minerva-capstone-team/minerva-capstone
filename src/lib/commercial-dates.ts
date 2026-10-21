import { addBusinessDays } from "./production";

export interface CommercialDate {
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
export function nthSunday(year: number, month: number, n: number) {
  const first = new Date(year, month, 1);
  const offset = (7 - first.getDay()) % 7;
  return new Date(year, month, 1 + offset + (n - 1) * 7);
}

export const DATES: CommercialDate[] = [
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


/** Días hábiles hacia atrás desde una fecha. */
export function subtractBusinessDays(date: Date, days: number) {
  const d = new Date(date);
  let left = days;
  while (left > 0) {
    d.setDate(d.getDate() - 1);
    if (d.getDay() !== 0 && d.getDay() !== 6) left--;
  }
  return d;
}


export { addBusinessDays };
