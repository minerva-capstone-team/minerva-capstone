import type { Product } from "./types";

export interface Recipient {
  id: string;
  label: string;
  /** Palabras del catálogo que calzan con esta persona. */
  match: RegExp;
  why: string;
}

export const RECIPIENTS: Recipient[] = [
  { id: "mama", label: "Mamá", match: /taz[aó]|mug|coj[ií]n|cuadro|calendario|agenda|planner|cuaderno|[aá]lbum|fotograf/i, why: "un detalle para usar todos los días" },
  { id: "papa", label: "Papá", match: /taz[aó]|mug|botella|vaso|reloj|mouse|polera|pap[aá]/i, why: "práctico y con su nombre o una frase" },
  { id: "pareja", label: "Mi pareja", match: /taz[aó]|m[aá]gic|foto|coj[ií]n|cuadro|cien citas|calendario|[aá]lbum/i, why: "con una foto o fecha que ustedes conocen" },
  { id: "amigo", label: "Amiga o amigo", match: /taz[aó]|mug|tote|botella|vaso|cuaderno|croquera|mouse/i, why: "personalizado con una broma o recuerdo" },
  { id: "nino", label: "Niña o niño", match: /etiqueta|escolar|saco dulcero|dulcer|botella|cuaderno|croquera|taz[aó]n m[aá]gico|coj[ií]n/i, why: "con su nombre y colores divertidos" },
  { id: "profe", label: "Profesora o profesor", match: /taz[aó]|mug|cuaderno|agenda|planner|croquera|tote|calendario/i, why: "un agradecimiento que usará en clases" },
  { id: "equipo", label: "Equipo o empresa", match: /taz[aó]|mug|tote|botella|agenda|cuaderno|tarjeta|estuche|mouse|calendario|flyer|etiqueta/i, why: "con logo o nombre, ideal para repartir" },
  { id: "yo", label: "Para mí", match: /.*/, why: "porque también mereces algo bonito" },
];

/** Productos pensados para una persona concreta (p. ej. "Día del Papá"): solo se sugieren a esa persona. */
const TARGETED: { name: RegExp; only: string }[] = [
  { name: /pap[aá]|padre/i, only: "papa" },
  { name: /mam[aá]|madre/i, only: "mama" },
];
const aimedElsewhere = (productName: string, whoId: string) => TARGETED.some((t) => t.name.test(productName) && t.only !== whoId);

export interface Budget {
  id: string;
  label: string;
  max: number;
}

export const BUDGETS: Budget[] = [
  { id: "b1", label: "Hasta $8.000", max: 8000 },
  { id: "b2", label: "Hasta $12.000", max: 12000 },
  { id: "b3", label: "Hasta $20.000", max: 20000 },
  { id: "b4", label: "Sin límite", max: Infinity },
];

export interface GiftPick {
  product: Product;
  reason: string;
}

/**
 * Ordena el catálogo real según para quién es el regalo y cuánto se quiere gastar.
 * Solo recomienda lo que hay en stock; lo que calza con la persona va primero.
 */
export function pickGifts(products: Product[], who: Recipient, budget: Budget, limit = 4): GiftPick[] {
  const pool = products.filter((p) => p.active && p.stock > 0 && p.price <= budget.max);
  const scored = pool.map((p) => {
    // Se compara con el nombre y la categoría: la descripción menciona de todo y da falsos positivos.
    const text = `${p.name} ${p.category?.name ?? ""}`;
    const fits = who.match.test(text) && !aimedElsewhere(p.name, who.id);
    const score = (fits ? 10 : 0) + (p.featured ? 2 : 0) + (p.customizable ? 2 : 0) + (p.badge === "mas-vendido" ? 2 : 0);
    return { product: p, fits, score };
  });
  return scored
    .filter((s) => s.fits)
    .sort((a, b) => b.score - a.score || b.product.price - a.product.price)
    .slice(0, limit)
    .map((s) => ({
      product: s.product,
      reason: s.product.customizable ? `Personalizable: ${who.why}.` : `Disponible ahora: ${who.why}.`,
    }));
}
