"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { Product } from "@/lib/types";
import { captureCouponFromUrl } from "@/lib/coupon-link";
import { useCart } from "@/lib/stores";
import { useAddToCart } from "./useAddToCart";

/**
 * Compra rápida desde un enlace (Instagram, correo): deja el producto en el carro, guarda el cupón
 * y manda directo al checkout. Si el producto es personalizable lleva a la ficha, donde hay que
 * elegir el diseño (eso no se puede saltar).
 */
export function QuickBuy({ product }: { product: Product }) {
  const router = useRouter();
  const addToCart = useAddToCart();
  const started = useRef(false);
  const [hydrated, setHydrated] = useState(false);
  const soldOut = product.stock <= 0;

  useEffect(() => {
    const done = () => setHydrated(true);
    if (useCart.persist.hasHydrated()) done();
    return useCart.persist.onFinishHydration(done);
  }, []);

  useEffect(() => {
    if (!hydrated || started.current) return;
    started.current = true;
    captureCouponFromUrl();
    if (soldOut) return;
    if (product.customizable) {
      router.replace(`/productos/${product.slug}#personalizar`);
      return;
    }
    const variant = product.variants.find((v) => v.stock !== 0) ?? null;
    const already = useCart.getState().items.some((i) => i.productId === product.id && i.variantId === (variant?.id ?? null));
    if (!already) addToCart(product, { variant, quantity: 1 });
    router.replace("/checkout");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  return (
    <div className="container-x grid min-h-[60dvh] place-items-center pb-16 pt-40 text-center">
      {soldOut ? (
        <div>
          <h1 className="display text-3xl">{product.name} está agotado</h1>
          <p className="mt-2 text-ink-soft">Mira otros productos parecidos o escríbenos por WhatsApp.</p>
          <Link href="/productos" className="btn btn-primary mt-6">
            Ver productos
          </Link>
        </div>
      ) : (
        <div role="status" aria-live="polite">
          <div className="mx-auto size-10 animate-spin rounded-full border-2 border-line border-t-ink" />
          <h1 className="display mt-6 text-2xl">Preparando tu pedido…</h1>
          <p className="mt-2 text-ink-soft">{product.name}</p>
          <Link href={`/productos/${product.slug}`} className="mt-6 inline-block text-sm text-ink-soft underline underline-offset-2">
            ¿No avanza? Ir al producto
          </Link>
        </div>
      )}
    </div>
  );
}
