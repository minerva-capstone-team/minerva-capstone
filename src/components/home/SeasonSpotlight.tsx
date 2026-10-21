import Link from "next/link";
import type { Product } from "@/lib/types";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ProductCard } from "@/components/product/ProductCard";

/** Campaña de fecha especial activa (se arma en /admin/promociones). No aparece si no hay campaña. */
export function SeasonSpotlight({ products }: { products: Product[] }) {
  const items = products.filter((p) => p.promo?.kind === "temporada" && p.stock > 0).slice(0, 8);
  if (!items.length) return null;
  const promo = items[0].promo!;
  const percent = Math.max(...items.map((p) => p.promo?.percent ?? 0));
  const ends = promo.ends_at ? new Date(promo.ends_at) : null;

  return (
    <section aria-labelledby="campana-title" className="container-x py-16 md:py-24">
      <div className="rounded-[2.5rem] bg-white p-6 shadow-[var(--shadow-soft)] sm:p-10">
        <SectionHeading
          id="campana-title"
          eyebrow={ends ? `Hasta el ${ends.toLocaleDateString("es-CL", { day: "numeric", month: "long", timeZone: "America/Santiago" })}` : "Por tiempo limitado"}
          title={
            <>
              Especial <span className="serif-accent text-gradient">{promo.label}</span>
            </>
          }
          description={percent > 0 ? `Elegimos estos productos con stock listo para regalar, con hasta ${percent}% de descuento.` : "Elegimos estos productos con stock listo para regalar a tiempo."}
          action={
            <Link href="/regalos" className="btn btn-ghost">
              Ayúdame a elegir
            </Link>
          }
        />
        <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
          {items.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </div>
    </section>
  );
}
