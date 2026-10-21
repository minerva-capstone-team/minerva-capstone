import type { Product } from "./types";

export const PRODUCT_SELECT =
  "*, category:categories(id,name,slug), images:product_images(*), variants:product_variants(*)";

/** Columna calculada de la base (0010): la promoción vigente del producto. */
export const STORE_PRODUCT_SELECT = `${PRODUCT_SELECT}, promo:promo_info`;

export function normalizeProduct(row: Record<string, unknown>): Product {
  const p = row as unknown as Product;
  const base = Number(p.price);
  const compare = p.compare_at_price == null ? null : Number(p.compare_at_price);
  const promo = p.promo ?? null;
  // Con promoción el precio que se muestra y se cobra es el rebajado; el normal queda tachado.
  const discounted = promo && promo.price < base;
  return {
    ...p,
    promo,
    price: discounted ? promo.price : base,
    compare_at_price: discounted ? Math.max(compare ?? 0, base) : compare,
    images: [...(p.images ?? [])].sort((a, b) => a.position - b.position),
    variants: [...(p.variants ?? [])].sort((a, b) => a.position - b.position),
  };
}
