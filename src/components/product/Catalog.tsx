"use client";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { Category, Product } from "@/lib/types";
import { cn } from "@/lib/format";
import { Icon } from "@/components/ui/Icon";
import { ProductCard } from "./ProductCard";
import { TextilQuote } from "./TextilQuote";

type Sort = "recientes" | "precio-asc" | "precio-desc" | "nombre";
const SORTS: { id: Sort; label: string }[] = [
  { id: "recientes", label: "Más recientes" },
  { id: "precio-asc", label: "Menor precio" },
  { id: "precio-desc", label: "Mayor precio" },
  { id: "nombre", label: "Nombre A–Z" },
];

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export function Catalog({
  products,
  categories,
  initialCategory,
  initialQuery,
  initialFilter,
}: {
  products: Product[];
  categories: Category[];
  initialCategory: string | null;
  initialQuery: string;
  initialFilter: "personalizable" | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [category, setCategory] = useState(initialCategory);
  const [query, setQuery] = useState(initialQuery);
  const [onlyCustom, setOnlyCustom] = useState(initialFilter === "personalizable");
  const [inStock, setInStock] = useState(false);
  const [sort, setSort] = useState<Sort>("recientes");

  // Sincroniza cuando cambian los parámetros (ej. enlaces del footer estando en esta página)
  useEffect(() => setCategory(initialCategory), [initialCategory]);
  useEffect(() => setQuery(initialQuery), [initialQuery]);
  useEffect(() => setOnlyCustom(initialFilter === "personalizable"), [initialFilter]);

  // Refleja filtros en la URL (compartible) sin recargar
  useEffect(() => {
    const params = new URLSearchParams();
    if (category) params.set("categoria", category);
    if (query) params.set("q", query);
    if (onlyCustom) params.set("filtro", "personalizable");
    const qs = params.toString();
    const url = qs ? `${pathname}?${qs}` : pathname;
    if (url !== `${window.location.pathname}${window.location.search}`) router.replace(url, { scroll: false });
  }, [category, query, onlyCustom, pathname, router]);

  const results = useMemo(() => {
    const terms = norm(query).split(/\s+/).filter(Boolean);
    const list = products.filter(
      (p) =>
        (!category || p.category?.slug === category) &&
        (!onlyCustom || p.customizable) &&
        (!inStock || p.stock > 0) &&
        terms.every((t) => norm(`${p.name} ${p.category?.name ?? ""} ${p.description}`).includes(t)),
    );
    const sorted = [...list];
    if (sort === "precio-asc") sorted.sort((a, b) => a.price - b.price);
    if (sort === "precio-desc") sorted.sort((a, b) => b.price - a.price);
    if (sort === "nombre") sorted.sort((a, b) => a.name.localeCompare(b.name, "es"));
    return sorted;
  }, [products, category, query, onlyCustom, inStock, sort]);

  const activeCount = Number(Boolean(category)) + Number(Boolean(query)) + Number(onlyCustom) + Number(inStock);

  return (
    <div className="mt-12">
      <div className="sticky top-[4.5rem] z-20 -mx-4 bg-paper/85 px-4 py-3 backdrop-blur-xl sm:top-20 sm:mx-0 sm:rounded-3xl sm:px-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0" role="group" aria-label="Filtrar por categoría">
            <button type="button" className="chip shrink-0" aria-pressed={!category} onClick={() => setCategory(null)}>
              Todo
            </button>
            {categories.map((c) => (
              <button key={c.id} type="button" className="chip shrink-0" aria-pressed={category === c.slug} onClick={() => setCategory(category === c.slug ? null : c.slug)}>
                {c.name}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="relative flex-1 lg:w-56 lg:flex-none">
              <span className="sr-only">Buscar en el catálogo</span>
              <Icon name="search" size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-soft" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar…"
                className="field !min-h-10 !rounded-full !py-2 pl-10"
              />
            </label>
            <button type="button" className="chip" aria-pressed={onlyCustom} onClick={() => setOnlyCustom((v) => !v)}>
              <Icon name="sparkle" size={14} /> Personalizables
            </button>
            <button type="button" className="chip" aria-pressed={inStock} onClick={() => setInStock((v) => !v)}>
              Con stock
            </button>
            <label className="relative">
              <span className="sr-only">Ordenar</span>
              <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="chip cursor-pointer appearance-none pr-9">
                {SORTS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
              <Icon name="down" size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" />
            </label>
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between text-sm text-ink-soft" aria-live="polite">
        <p>{category === "estampados-textil" && results.length === 0 ? "Se cotiza por WhatsApp" : `${results.length} ${results.length === 1 ? "producto" : "productos"}`}</p>
        {activeCount > 0 && (
          <button
            type="button"
            className="font-medium text-ink underline-offset-4 hover:underline"
            onClick={() => {
              setCategory(null);
              setQuery("");
              setOnlyCustom(false);
              setInStock(false);
            }}
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {results.length === 0 && category === "estampados-textil" && !query ? (
        <TextilQuote />
      ) : results.length === 0 ? (
        <div className="mt-8 flex flex-col items-center rounded-[2rem] bg-paper-2 px-6 py-20 text-center">
          <span className="grid size-16 place-items-center rounded-full bg-white">
            <Icon name="search" size={26} />
          </span>
          <h2 className="display mt-5 text-3xl">No encontramos productos</h2>
          <p className="mt-2 max-w-sm text-ink-soft">Prueba con otra búsqueda o categoría. Si buscas algo especial, podemos crearlo para ti.</p>
          <button
            type="button"
            className="btn btn-primary mt-6"
            onClick={() => {
              setCategory(null);
              setQuery("");
              setOnlyCustom(false);
              setInStock(false);
            }}
          >
            Ver todos los productos
          </button>
        </div>
      ) : (
        <div className={cn("mt-6 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 lg:gap-x-6 xl:grid-cols-4")}>
          {results.map((p, i) => (
            <ProductCard key={p.id} product={p} priority={i < 4} className="animate-[fade-up_0.6s_var(--ease-out-expo)_both]" />
          ))}
        </div>
      )}
    </div>
  );
}
