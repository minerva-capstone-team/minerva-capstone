"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { cartCount, cartTotal, useCart, useUI } from "@/lib/stores";
import { formatCLP } from "@/lib/format";
import { useFreeShippingMin } from "@/lib/checkout";
import { Overlay } from "@/components/ui/Overlay";
import { Icon } from "@/components/ui/Icon";
import { QuantityStepper } from "@/components/ui/QuantityStepper";
import { ProductImage } from "@/components/product/ProductImage";

export function CartDrawer() {
  const { overlay, close } = useUI();
  const { items, setQuantity, remove } = useCart();
  const pathname = usePathname();
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  useEffect(() => close(), [pathname, close]);

  const count = cartCount(items);
  const total = cartTotal(items);
  const freeMin = useFreeShippingMin();

  return (
    <Overlay
      open={overlay === "cart"}
      onClose={close}
      label="Carrito de compras"
      panelClassName="right-0 top-0 flex h-dvh w-full max-w-[26rem] flex-col bg-paper shadow-2xl sm:rounded-l-[2rem]"
    >
      <div className="flex items-center justify-between border-b border-line px-5 py-4 sm:px-7">
        <div>
          <h2 className="display text-2xl">Tu carrito</h2>
          <p className="text-sm text-ink-soft">{hydrated && count ? `${count} ${count === 1 ? "producto" : "productos"}` : "Sin productos aún"}</p>
        </div>
        <button type="button" onClick={close} className="grid size-11 place-items-center rounded-full hover:bg-ink/5" aria-label="Cerrar carrito">
          <Icon name="x" />
        </button>
      </div>

      {hydrated && items.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
          <div className="relative mb-6 grid size-28 place-items-center rounded-full bg-paper-2">
            <Icon name="bag" size={40} className="text-ink-soft" />
            <span className="bg-gradient-minerva absolute right-3 top-3 size-4 rounded-full" />
          </div>
          <h3 className="display text-2xl">Tu carrito está vacío</h3>
          <p className="mt-2 max-w-xs text-ink-soft">Encuentra algo que hable por ti: tazas, papelería, stickers y más.</p>
          <Link href="/productos" onClick={close} className="btn btn-primary mt-6">
            Ver productos <Icon name="arrow" size={18} />
          </Link>
        </div>
      ) : (
        <>
          <ul className="flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 py-5 sm:px-7">
            {items.map((item) => (
              <li key={item.key} className="flex gap-4 rounded-2xl bg-white p-3 shadow-[var(--shadow-soft)]">
                <Link
                  href={`/productos/${item.slug}`}
                  onClick={close}
                  className="relative aspect-[4/5] w-20 shrink-0 overflow-hidden rounded-xl bg-paper-2"
                >
                  <ProductImage src={item.image} art={item.art} alt={item.name} sizes="80px" />
                </Link>
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <Link href={`/productos/${item.slug}`} onClick={close} className="line-clamp-2 text-sm font-semibold leading-snug hover:underline">
                      {item.name}
                    </Link>
                    <button
                      type="button"
                      onClick={() => remove(item.key)}
                      className="-mr-1 -mt-1 grid size-9 shrink-0 place-items-center rounded-full text-ink-soft hover:bg-m-red/10 hover:text-m-red"
                      aria-label={`Eliminar ${item.name}`}
                    >
                      <Icon name="trash" size={17} />
                    </button>
                  </div>
                  {item.variantName && <p className="text-xs text-ink-soft">{item.variantName}</p>}
                  {item.customization && (
                    <p className="mt-1 line-clamp-2 text-xs text-ink-soft">
                      <span className="font-medium text-m-violet">Personalizado:</span>{" "}
                      {[item.customization.name && `“${item.customization.name}”`, item.customization.text && `“${item.customization.text}”`, item.customization.imageDataUrl && "con imagen"]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  )}
                  <div className="mt-auto flex items-center justify-between pt-2">
                    <QuantityStepper
                      size="sm"
                      value={item.quantity}
                      max={item.maxQuantity}
                      min={0}
                      onChange={(q) => setQuantity(item.key, q)}
                      label={`Cantidad de ${item.name}`}
                    />
                    <span className="text-sm font-semibold tabular-nums">{formatCLP(item.unitPrice * item.quantity)}</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <div className="border-t border-line bg-white/70 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5 backdrop-blur sm:px-7">
            <div className="flex items-baseline justify-between">
              <span className="text-ink-soft">Subtotal</span>
              <span className="display text-2xl tabular-nums">{formatCLP(total)}</span>
            </div>
            {freeMin != null && freeMin > 0 ? (
              <div className="mt-2">
                <p className="text-xs text-ink-soft">
                  {total >= freeMin ? "¡Tienes envío gratis! 🎉" : `Te faltan ${formatCLP(freeMin - total)} para envío gratis.`}
                </p>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-line" aria-hidden>
                  <div className="bg-gradient-minerva h-full rounded-full transition-[width] duration-500" style={{ width: `${Math.min(100, (total / freeMin) * 100)}%` }} />
                </div>
              </div>
            ) : (
              <p className="mt-1 text-xs text-ink-soft">El despacho se calcula y coordina al finalizar tu compra.</p>
            )}
            <Link href="/checkout" onClick={close} className="btn btn-primary mt-4 w-full">
              Finalizar compra <Icon name="arrow" size={18} />
            </Link>
            <button type="button" onClick={close} className="mt-2 w-full py-2 text-sm font-medium text-ink-soft hover:text-ink">
              Seguir comprando
            </button>
          </div>
        </>
      )}
    </Overlay>
  );
}
