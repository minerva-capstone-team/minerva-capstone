import Link from "next/link";
import Image from "next/image";
import type { Category } from "@/lib/types";
import { cn } from "@/lib/format";
import { Icon } from "@/components/ui/Icon";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ProductArt } from "@/components/product/ProductArt";

// Bento editorial: las dos primeras categorías son grandes
const LAYOUT = [
  "sm:col-span-2 lg:col-span-7 lg:row-span-2 aspect-[5/4] sm:aspect-[16/11] lg:aspect-auto",
  "lg:col-span-5 aspect-[5/4] sm:aspect-square lg:aspect-[16/10]",
  "lg:col-span-5 aspect-[5/4] sm:aspect-square lg:aspect-[16/10]",
  "lg:col-span-4 aspect-[5/4] sm:aspect-square",
  "lg:col-span-4 aspect-[5/4] sm:aspect-square",
  "lg:col-span-4 aspect-[5/4] sm:aspect-square",
];

export function Categories({ categories, counts }: { categories: Category[]; counts: Record<string, number> }) {
  return (
    <section aria-labelledby="categorias-title" className="container-x py-24 md:py-32">
      <SectionHeading
        id="categorias-title"
        eyebrow="Categorías"
        title={
          <>
            Algo especial para <span className="serif-accent">cada</span> momento
          </>
        }
        action={
          <Link href="/productos" className="btn btn-ghost">
            Ver todo <Icon name="arrow" size={18} />
          </Link>
        }
      />

      <div data-reveal="stagger" className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-12 lg:gap-5">
        {categories.slice(0, 6).map((cat, i) => (
          <Link
            key={cat.id}
            href={`/productos?categoria=${cat.slug}`}
            className={cn("group relative isolate overflow-hidden rounded-[1.75rem] bg-paper-2", LAYOUT[i] ?? LAYOUT[3])}
          >
            <div className="absolute inset-0 -z-10 transition-transform duration-[1200ms] ease-[var(--ease-out-expo)] group-hover:scale-[1.05]">
              {cat.image_url ? (
                <Image src={cat.image_url} alt="" fill sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" />
              ) : (
                <ProductArt art={cat.placeholder_art ?? "mug"} className="size-full" />
              )}
            </div>
            <div className="absolute inset-0 -z-10 bg-gradient-to-t from-ink/55 via-ink/5 to-transparent opacity-80 transition-opacity duration-700 group-hover:opacity-100" />
            <div className="bg-gradient-minerva absolute inset-x-0 bottom-0 -z-10 h-1 origin-left scale-x-0 transition-transform duration-700 ease-[var(--ease-out-expo)] group-hover:scale-x-100" />
            <div className="flex h-full items-end justify-between gap-4 p-5 text-white sm:p-7">
              <div className="transition-transform duration-700 ease-[var(--ease-out-expo)] group-hover:-translate-y-1">
                <p className="text-xs font-medium uppercase tracking-widest text-white/80">
                  {cat.slug === "estampados-textil" && !(counts[cat.id] ?? 0)
                    ? "Cotiza por WhatsApp"
                    : `${counts[cat.id] ?? 0} ${counts[cat.id] === 1 ? "producto" : "productos"}`}
                </p>
                <h3 className={cn("display mt-1", i === 0 ? "text-4xl sm:text-5xl" : "text-3xl")}>{cat.name}</h3>
                {cat.description && (
                  <p className="mt-2 max-h-0 max-w-xs overflow-hidden text-sm text-white/85 opacity-0 transition-all duration-700 ease-[var(--ease-out-expo)] group-hover:max-h-16 group-hover:opacity-100 max-lg:max-h-16 max-lg:opacity-100">
                    {cat.description}
                  </p>
                )}
              </div>
              <span className="grid size-12 shrink-0 place-items-center rounded-full bg-white text-ink transition-transform duration-700 ease-[var(--ease-out-expo)] group-hover:-rotate-45">
                <Icon name="arrow" />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
