"use client";
import { toast, useCart, useUI } from "@/lib/stores";
import type { Customization, Product, ProductVariant } from "@/lib/types";

export function useAddToCart() {
  const add = useCart((s) => s.add);
  const items = useCart((s) => s.items);
  const openUI = useUI((s) => s.open);

  return (product: Product, opts: { variant?: ProductVariant | null; quantity?: number; customization?: Customization | null } = {}) => {
    const variant = opts.variant ?? null;
    const inCart = items.filter((i) => i.productId === product.id).reduce((n, i) => n + i.quantity, 0);
    const variantInCart = variant ? items.filter((i) => i.variantId === variant.id).reduce((n, i) => n + i.quantity, 0) : 0;
    const variantAvailable = variant && variant.stock !== null ? variant.stock - variantInCart : Infinity;
    const available = Math.min(product.stock - inCart, variantAvailable);
    if (available <= 0) {
      toast({ title: "Sin stock disponible", description: "Ya tienes en el carrito todas las unidades disponibles.", tone: "error" });
      return false;
    }
    const quantity = Math.min(opts.quantity ?? 1, available);
    add({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      unitPrice: product.price + (variant?.price_delta ?? 0),
      quantity,
      maxQuantity: variant && variant.stock !== null ? Math.min(product.stock, variant.stock) : product.stock,
      variantId: variant?.id ?? null,
      variantName: variant?.name ?? null,
      image: product.images[0]?.image_url ?? null,
      art: product.placeholder_art,
      customization: opts.customization ?? null,
    });
    toast({
      title: "Agregado al carrito",
      description: `${quantity} × ${product.name}`,
      action: { label: "Ver carrito", onClick: () => openUI("cart") },
    });
    return true;
  };
}
