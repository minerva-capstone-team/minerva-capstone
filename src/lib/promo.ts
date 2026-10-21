/**
 * Promociones automáticas. La regla real vive en la base de datos (promo_info en 0010):
 * aquí solo está la misma cuenta para la vista previa del panel y los tipos.
 */

export interface ProductPromo {
  kind: "stock" | "temporada";
  percent: number;
  label: string;
  ends_at: string | null;
  /** Precio con la promoción aplicada (lo calcula la base de datos). */
  price: number;
}

export interface PromoSettings {
  low_stock_enabled: boolean;
  low_stock_threshold: number;
  low_stock_percent: number;
  low_stock_skip_custom: boolean;
  season_enabled: boolean;
  season_name: string | null;
  season_percent: number;
  season_starts_at: string | null;
  season_ends_at: string | null;
  season_product_ids: string[];
}

export const DEFAULT_PROMO: PromoSettings = {
  low_stock_enabled: false,
  low_stock_threshold: 3,
  low_stock_percent: 15,
  low_stock_skip_custom: false,
  season_enabled: false,
  season_name: null,
  season_percent: 10,
  season_starts_at: null,
  season_ends_at: null,
  season_product_ids: [],
};

interface PromoProduct {
  id: string;
  price: number;
  stock: number;
  active: boolean;
  customizable: boolean;
}

/** Igual que promo_info() en SQL: gana el mayor descuento; null si no aplica ninguna. */
export function computePromo(p: PromoProduct, s: PromoSettings, now = new Date()): ProductPromo | null {
  const options: ProductPromo[] = [];
  const t = now.getTime();
  if (
    s.season_enabled &&
    p.active &&
    p.stock > 0 &&
    s.season_product_ids.includes(p.id) &&
    (!s.season_starts_at || new Date(s.season_starts_at).getTime() <= t) &&
    (!s.season_ends_at || new Date(s.season_ends_at).getTime() > t)
  ) {
    options.push({ kind: "temporada", percent: s.season_percent, label: s.season_name?.trim() || "Campaña especial", ends_at: s.season_ends_at, price: 0 });
  }
  if (s.low_stock_enabled && p.active && p.stock > 0 && p.stock <= s.low_stock_threshold && !(s.low_stock_skip_custom && p.customizable)) {
    options.push({ kind: "stock", percent: s.low_stock_percent, label: "Últimas unidades", ends_at: null, price: 0 });
  }
  const best = options.sort((a, b) => b.percent - a.percent || a.kind.localeCompare(b.kind))[0];
  if (!best) return null;
  return { ...best, price: Math.max(1, Math.floor((p.price * (100 - best.percent)) / 100)) };
}
