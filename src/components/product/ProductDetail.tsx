"use client";
import Image from "next/image";
import { useRef, useState } from "react";
import type { Customization, Product } from "@/lib/types";
import { badgeLabel, cn, formatCLP, stockLabel } from "@/lib/format";
import { downscaleImage } from "@/lib/images";
import { productInquiry } from "@/lib/whatsapp";
import { toast, useCart } from "@/lib/stores";
import { Icon, WhatsAppIcon } from "@/components/ui/Icon";
import { QuantityStepper } from "@/components/ui/QuantityStepper";
import { useAddToCart } from "@/components/cart/useAddToCart";
import { ProductArt } from "./ProductArt";
import { CustomizationPreview } from "./previews";

function Gallery({ product }: { product: Product }) {
  const slides: { key: string; node: React.ReactNode }[] = product.images.length
    ? product.images.map((img, i) => ({
        key: img.id,
        node: (
          <Image
            src={img.image_url}
            alt={`${product.name} — foto ${i + 1}`}
            fill
            priority={i === 0}
            sizes="(min-width: 1024px) 55vw, 100vw"
            className="object-cover"
          />
        ),
      }))
    : ([0, 1] as const).map((view) => ({
        key: `art-${view}`,
        node: <ProductArt art={product.placeholder_art ?? "mug"} view={view} title={product.name} className="absolute inset-0 size-full" />,
      }));
  const [index, setIndex] = useState(0);
  const track = useRef<HTMLDivElement>(null);

  const go = (i: number) => {
    setIndex(i);
    const el = track.current;
    if (el) el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  };

  return (
    <div className="lg:sticky lg:top-24">
      <div
        ref={track}
        onScroll={(e) => {
          const el = e.currentTarget;
          const i = Math.round(el.scrollLeft / el.clientWidth);
          if (i !== index) setIndex(i);
        }}
        className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto rounded-[2rem] bg-paper-2"
        role="region"
        aria-label="Galería de fotos"
        tabIndex={0}
      >
        {slides.map((s) => (
          <div key={s.key} className="relative aspect-[4/5] w-full shrink-0 snap-center overflow-hidden">
            {s.node}
          </div>
        ))}
      </div>
      {slides.length > 1 && (
        <div className="mt-3 flex gap-3" role="tablist" aria-label="Elegir foto">
          {slides.map((s, i) => (
            <button
              key={s.key}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`Ver foto ${i + 1}`}
              onClick={() => go(i)}
              className={cn(
                "relative aspect-square w-20 overflow-hidden rounded-2xl bg-paper-2 ring-2 ring-offset-2 ring-offset-paper transition-all",
                i === index ? "ring-ink" : "ring-transparent opacity-70 hover:opacity-100",
              )}
            >
              {product.images[i] ? (
                <Image src={product.images[i].image_url} alt="" fill sizes="80px" className="object-cover" />
              ) : (
                <ProductArt art={product.placeholder_art ?? "mug"} view={i as 0 | 1} className="absolute inset-0 size-full" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function ProductDetail({ product }: { product: Product }) {
  const addToCart = useAddToCart();
  const inCart = useCart((s) => s.items.filter((i) => i.productId === product.id).reduce((n, i) => n + i.quantity, 0));
  const [variantId, setVariantId] = useState(product.variants.find((v) => v.stock !== 0)?.id ?? product.variants[0]?.id ?? null);
  const inCartVariant = useCart((s) => (variantId ? s.items.filter((i) => i.variantId === variantId).reduce((n, i) => n + i.quantity, 0) : 0));
  const [quantity, setQuantity] = useState(1);
  const [text, setText] = useState("");
  const [name, setName] = useState("");
  const [image, setImage] = useState<{ dataUrl: string; name: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const variant = product.variants.find((v) => v.id === variantId) ?? null;
  const unitPrice = product.price + (variant?.price_delta ?? 0);
  const stock = stockLabel(product.stock);
  const variantLeft = variant && variant.stock !== null ? variant.stock - inCartVariant : Infinity;
  const available = Math.max(0, Math.min(product.stock - inCart, variantLeft));
  const customization: Customization | null =
    product.customizable && (text.trim() || name.trim() || image)
      ? { text: text.trim() || undefined, name: name.trim() || undefined, imageDataUrl: image?.dataUrl, imageName: image?.name }
      : null;

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      const dataUrl = await downscaleImage(file);
      setImage({ dataUrl, name: file.name });
    } catch (e) {
      toast({ title: "No pudimos cargar la imagen", description: e instanceof Error ? e.message : undefined, tone: "error" });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const onAdd = () => {
    if (addToCart(product, { variant, quantity, customization })) {
      setJustAdded(true);
      setTimeout(() => setJustAdded(false), 1800);
      setQuantity(1);
    }
  };

  const extra = [variant && `Variante: ${variant.name}`, name.trim() && `Nombre: ${name.trim()}`, text.trim() && `Texto: "${text.trim()}"`].filter(Boolean).join("\n");

  return (
    <>
      <div className="container-x mt-6 grid gap-10 lg:grid-cols-12 lg:gap-14">
        <div className="lg:col-span-7">
          <Gallery product={product} />
        </div>

        <div className="lg:col-span-5">
          <div className="flex flex-wrap items-center gap-2">
            {product.category && <p className="eyebrow">{product.category.name}</p>}
            {product.badge && <span className="rounded-full bg-ink px-2.5 py-1 text-[0.7rem] font-semibold uppercase tracking-wider text-white">{badgeLabel[product.badge]}</span>}
          </div>
          <h1 className="display mt-4 text-[clamp(2.25rem,4.5vw,3.5rem)]">{product.name}</h1>
          <div className="mt-4 flex items-baseline gap-3">
            <p className="display text-3xl tabular-nums">{formatCLP(unitPrice)}</p>
            {product.compare_at_price && product.compare_at_price > product.price && (
              <p className="text-lg text-ink-soft line-through tabular-nums">{formatCLP(product.compare_at_price + (variant?.price_delta ?? 0))}</p>
            )}
            <span className="text-sm text-ink-soft">CLP</span>
          </div>
          <p className="mt-5 text-lg leading-relaxed text-ink-2">{product.description}</p>

          <ul className="mt-6 grid grid-cols-2 gap-3 text-sm">
            <li className="flex items-center gap-2 rounded-2xl bg-white p-3">
              <span className={cn("size-2.5 shrink-0 rounded-full", stock.tone === "out" ? "bg-m-red" : stock.tone === "low" ? "bg-m-orange" : "bg-m-green")} />
              {stock.label}
            </li>
            <li className="flex items-center gap-2 rounded-2xl bg-white p-3">
              <Icon name="clock" size={18} className="shrink-0 text-m-violet" />
              Preparación: {product.preparation_days} {product.preparation_days === 1 ? "día hábil" : "días hábiles"}
            </li>
          </ul>

          {product.variants.length > 0 && (
            <fieldset className="mt-8">
              <legend className="label">Variante</legend>
              <div className="flex flex-wrap gap-2" role="radiogroup">
                {product.variants.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    role="radio"
                    aria-checked={v.id === variantId}
                    disabled={v.stock === 0}
                    className={cn("chip", v.stock === 0 && "cursor-not-allowed line-through opacity-50")}
                    onClick={() => setVariantId(v.id)}
                  >
                    {v.name}
                    {v.stock === 0 && <span className="no-underline">agotada</span>}
                    {v.price_delta !== 0 && <span className="opacity-70">{v.price_delta > 0 ? "+" : "−"}{formatCLP(Math.abs(v.price_delta))}</span>}
                  </button>
                ))}
              </div>
            </fieldset>
          )}

          {product.customizable && (
            <div id="personalizar" className="mt-8 rounded-[1.75rem] border border-line bg-white p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="display text-xl">
                  <Icon name="sparkle" size={18} className="-mt-1 mr-1.5 inline text-m-magenta" />
                  Personalízalo
                </h2>
                <span className="text-xs text-ink-soft">Opcional</span>
              </div>
              <div className="mt-5 space-y-4">
                <div>
                  <label htmlFor="p-name" className="label">
                    Nombre
                  </label>
                  <input id="p-name" className="field" maxLength={18} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Papá, Cami, Equipo Ventas" />
                </div>
                <div>
                  <div className="flex items-baseline justify-between">
                    <label htmlFor="p-text" className="label">
                      Texto para personalizar
                    </label>
                    <span className="text-xs tabular-nums text-ink-soft">{text.length}/60</span>
                  </div>
                  <textarea
                    id="p-text"
                    className="field resize-none"
                    rows={2}
                    maxLength={60}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Una frase, fecha o dedicatoria"
                  />
                </div>
                <div>
                  <span className="label">Imagen, foto o logo</span>
                  <input
                    ref={fileRef}
                    id="p-file"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="sr-only"
                    onChange={(e) => onFile(e.target.files?.[0])}
                  />
                  {image ? (
                    <div className="flex items-center gap-3 rounded-2xl border border-line p-2.5">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={image.dataUrl} alt="Imagen cargada" className="size-14 rounded-xl object-cover" />
                      <span className="min-w-0 flex-1 truncate text-sm">{image.name}</span>
                      <button type="button" onClick={() => setImage(null)} className="grid size-10 place-items-center rounded-full hover:bg-m-red/10 hover:text-m-red" aria-label="Quitar imagen">
                        <Icon name="trash" size={18} />
                      </button>
                    </div>
                  ) : (
                    <label
                      htmlFor="p-file"
                      className={cn(
                        "flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-line px-4 py-5 text-sm font-medium text-ink-2 transition-colors hover:border-m-violet hover:bg-m-violet/5",
                        uploading && "pointer-events-none opacity-60",
                      )}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        onFile(e.dataTransfer.files?.[0]);
                      }}
                    >
                      <Icon name={uploading ? "clock" : "upload"} size={18} />
                      {uploading ? "Procesando imagen…" : "Sube o arrastra tu imagen (JPG, PNG, WEBP)"}
                    </label>
                  )}
                </div>
                <p className="text-xs text-ink-soft">Antes de producir te enviamos el diseño final por WhatsApp para tu aprobación.</p>
              </div>
            </div>
          )}

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <QuantityStepper value={quantity} onChange={setQuantity} max={Math.max(1, available)} />
            <button type="button" onClick={onAdd} disabled={available <= 0} className="btn btn-primary h-14 min-w-0 flex-1 text-base">
              <Icon name={justAdded ? "check" : "bag"} size={20} />
              {product.stock <= 0 || variant?.stock === 0 ? "Agotado" : available <= 0 ? "Ya tienes todo el stock" : justAdded ? "¡Añadido!" : `Añadir al carrito · ${formatCLP(unitPrice * quantity)}`}
            </button>
          </div>
          <a href={productInquiry(product.name, extra)} target="_blank" rel="noopener noreferrer" className="btn btn-wa mt-3 h-14 w-full text-base">
            <WhatsAppIcon /> Consultar por WhatsApp
          </a>

          <div className="mt-8 divide-y divide-line border-y border-line">
            <details className="group py-1" open>
              <summary className="flex cursor-pointer list-none items-center justify-between py-3 font-semibold [&::-webkit-details-marker]:hidden">
                Detalles
                <Icon name="down" size={18} className="transition-transform group-open:rotate-180" />
              </summary>
              <ul className="space-y-1.5 pb-4 text-ink-soft">
                <li>• Estampado de alta durabilidad</li>
                <li>• Diseño revisado y aprobado por ti antes de producir</li>
                <li>• Empaque protegido, listo para regalar</li>
              </ul>
            </details>
            <details className="group py-1">
              <summary className="flex cursor-pointer list-none items-center justify-between py-3 font-semibold [&::-webkit-details-marker]:hidden">
                Envíos y retiro
                <Icon name="down" size={18} className="transition-transform group-open:rotate-180" />
              </summary>
              <p className="pb-4 text-ink-soft">
                Enviamos a todo Chile. Una vez listo tu pedido ({product.preparation_days} días hábiles aprox.) coordinamos el despacho y su costo por WhatsApp.
              </p>
            </details>
          </div>
        </div>
      </div>

      {product.customizable && (
        <section aria-labelledby="preview-title" className="container-x mt-24">
          <div className="grid items-center gap-10 overflow-hidden rounded-[2.5rem] bg-white p-6 shadow-[var(--shadow-soft)] sm:p-10 lg:grid-cols-2 lg:p-14">
            <div>
              <p className="eyebrow">Vista previa</p>
              <h2 id="preview-title" className="display mt-4 text-[clamp(2rem,4vw,3.25rem)]">
                Así quedará <span className="serif-accent text-gradient">tu producto</span>
              </h2>
              <p className="mt-4 max-w-md text-ink-soft">
                Esta vista se actualiza en tiempo real con lo que escribes y subes. Es referencial: nuestro equipo ajusta el diseño final y te lo envía para aprobación.
              </p>
              <a href="#personalizar" className="btn btn-ghost mt-6">
                <Icon name="edit" size={18} /> Editar personalización
              </a>
            </div>
            <div className="relative mx-auto aspect-[4/5] w-full max-w-md rounded-[2rem] bg-paper-2">
              <CustomizationPreview
                kind={product.preview_kind}
                print={{ text, name, image: image?.dataUrl }}
                variantName={variant?.name ?? null}
                art={product.placeholder_art}
                productName={product.name}
              />
            </div>
          </div>
        </section>
      )}
    </>
  );
}
