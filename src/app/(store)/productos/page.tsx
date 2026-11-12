import type { Metadata } from "next";
import { getCategories, getProducts } from "@/lib/catalog";
import { Catalog } from "@/components/product/Catalog";

export const metadata: Metadata = {
  title: "Productos personalizados",
  description: "Sublimación (tazones, mugs, botellas, cojines), papelería (calendarios, cuadernos, agendas, tarjetas) y estampado textil. Hechos a pedido en Chile por Minerva.",
  alternates: { canonical: "/productos" },
};

export default async function ProductsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const [products, categories, params] = await Promise.all([getProducts(), getCategories(), searchParams]);
  return (
    <div className="container-x pb-12 pt-32 md:pt-40">
      <header className="max-w-3xl">
        <p className="eyebrow">Tienda</p>
        <h1 className="display mt-4 text-[clamp(2.75rem,7vw,5.5rem)]">
          Todo para <span className="serif-accent text-gradient">regalar</span> y crear
        </h1>
        <p className="mt-4 text-lg text-ink-soft">Elige un producto, personalízalo y nosotros lo hacemos realidad.</p>
      </header>
      <Catalog
        products={products}
        categories={categories}
        initialCategory={params.categoria ?? null}
        initialQuery={params.q ?? ""}
        initialFilter={params.filtro === "personalizable" ? "personalizable" : null}
      />
    </div>
  );
}
