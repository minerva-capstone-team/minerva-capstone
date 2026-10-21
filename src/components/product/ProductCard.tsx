"use client";
import Link from "next/link";
import { useState } from "react";
import type { Product } from "@/lib/types";
import { badgeLabel, cn, formatCLP, stockLabel } from "@/lib/format";
import { Icon } from "@/components/ui/Icon";
import { useAddToCart } from "@/components/cart/useAddToCart";
import { ProductImage } from "./ProductImage";

const SIZES = "(min-width: 1280px) 22vw, (min-width: 768px) 30vw, 50vw";

export function ProductCard({ product, priority, className }: { product: Product; priority?: boolean; className?: string }) {
  const addToCart = useAddToCart();
  const [added, setAdded] = useState(false);
  const stock = stockLabel(product.stock);
  const second = product.images[1]?.image_url;
  const showAlt = Boolean(second) || (!product.images[0] && Boolean(product.placeholder_art));
  const onSale = product.compare_at_price != null && product.compare_at_price > product.price;

  return (
    <article className={cn("group relative flex flex-col", className)}>
      <div className="relative aspect-[4/5] overflow-hidden rounded-[1.5rem] bg-paper-2">
        <div className="absolute inset-0 transition-transform duration-[900ms] ease-[var(--ease-out-expo)] group-hover:scale-[1.04]">
          <ProductImage src={product.images[0]?.image_url} art={product.placeholder_art} alt={product.name} priority={priority} sizes={SIZES} />
        </div>
        {showAlt && (
          <div className="absolute inset-0 opacity-0 transition-opacity duration-700 group-hover:opacity-100">
            <ProductImage src={second} art={product.placeholder_art} view={1} alt="" sizes={SIZES} />
          </div>
        )}
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          {product.badge && (
            <span
              className={cn(
                "rounded-full px-2.5 py-1 text-[0.7rem] font-semibold uppercase tracking-wider",
                product.badge === "mas-vendido" ? "bg-ink text-white" : product.badge === "nuevo" ? "bg-gradient-minerva text-white" : "bg-white text-ink",
              )}
            >
              {badgeLabel[product.badge]}
            </span>
          )}
          {product.promo && (
            <span className={cn("rounded-full px-2.5 py-1 text-[0.7rem] font-semibold uppercase tracking-wider", product.promo.kind === "stock" ? "bg-m-orange text-white" : "bg-gradient-minerva text-white")}>
              {product.promo.label}
            </span>
          )}
          {onSale && (
            <span className="rounded-full bg-m-red px-2.5 py-1 text-[0.7rem] font-semibold uppercase tracking-wider text-white">
              -{Math.round((1 - product.price / product.compare_at_price!) * 100)}%
            </span>
          )}
        </div>

        <button
          type="button"
          disabled={stock.tone === "out"}
          onClick={() => {
            if (addToCart(product, { variant: product.variants[0] ?? null })) {
              setAdded(true);
              setTimeout(() => setAdded(false), 1600);
            }
          }}
          aria-label={stock.tone === "out" ? `${product.name}: agotado` : `Agregar ${product.name} al carrito`}
          className={cn(
            "absolute bottom-3 right-3 z-10 flex h-11 items-center gap-2 rounded-full px-3.5 text-sm font-semibold shadow-[var(--shadow-soft)] backdrop-blur transition-[transform,opacity,background-color,color] duration-500 ease-[var(--ease-out-expo)]",
            added ? "bg-ink text-white" : "bg-white/90 text-ink hover:bg-ink hover:text-white",
            "disabled:cursor-not-allowed disabled:bg-white/80 disabled:text-ink-soft",
            "lg:translate-y-2 lg:opacity-0 lg:group-focus-within:translate-y-0 lg:group-focus-within:opacity-100 lg:group-hover:translate-y-0 lg:group-hover:opacity-100",
          )}
        >
          <Icon name={added ? "check" : "plus"} size={18} />
          <span className="hidden sm:inline">{stock.tone === "out" ? "Agotado" : added ? "Agregado" : "Agregar"}</span>
        </button>
      </div>

      <div className="mt-4 flex items-start justify-between gap-3 px-1">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wider text-ink-soft">{product.category?.name}</p>
          <h3 className="mt-1 font-semibold leading-snug">
            {/* El ::after hace clickeable toda la tarjeta */}
            <Link href={`/productos/${product.slug}`} className="after:absolute after:inset-0 after:rounded-[1.5rem] after:content-['']">
              <span className="bg-[linear-gradient(currentColor,currentColor)] bg-[length:0%_1px] bg-left-bottom bg-no-repeat transition-[background-size] duration-500 group-hover:bg-[length:100%_1px]">
                {product.name}
              </span>
            </Link>
          </h3>
          <p className={cn("mt-1 text-xs font-medium", stock.tone === "out" ? "text-m-red" : stock.tone === "low" ? "text-[#b8481f]" : "text-[#23795d]")}>
            ● {stock.label}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-semibold tabular-nums">{formatCLP(product.price)}</p>
          {onSale && <p className="text-xs text-ink-soft line-through tabular-nums">{formatCLP(product.compare_at_price!)}</p>}
        </div>
      </div>
    </article>
  );
}

export function ProductCardSkeleton() {
  return (
    <div aria-hidden>
      <div className="skeleton aspect-[4/5] rounded-[1.5rem]" />
      <div className="mt-4 space-y-2 px-1">
        <div className="skeleton h-3 w-1/3 rounded-full" />
        <div className="skeleton h-4 w-3/4 rounded-full" />
        <div className="skeleton h-3 w-1/4 rounded-full" />
      </div>
    </div>
  );
}
