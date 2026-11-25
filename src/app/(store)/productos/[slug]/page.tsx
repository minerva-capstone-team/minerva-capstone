import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { getProduct, getProducts } from "@/lib/catalog";
import { site } from "@/lib/site";
import { Icon } from "@/components/ui/Icon";
import { ProductDetail } from "@/components/product/ProductDetail";
import { ProductCard } from "@/components/product/ProductCard";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return (await getProducts()).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await getProduct((await params).slug);
  if (!product) return { title: "Producto no encontrado" };
  const image = product.images[0]?.image_url ?? "/og.png";
  return {
    title: product.name,
    description: product.description.slice(0, 155),
    alternates: { canonical: `/productos/${product.slug}` },
    openGraph: { title: product.name, description: product.description.slice(0, 155), images: [image], type: "website" },
    twitter: { card: "summary_large_image", title: product.name, description: product.description.slice(0, 155), images: [image] },
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const [product, all] = await Promise.all([getProduct(slug), getProducts()]);
  if (!product) notFound();
  // Enlace viejo: el producto cambió de URL en el panel.
  if (product.slug !== slug) permanentRedirect(`/productos/${product.slug}`);

  const related = [
    ...all.filter((p) => p.id !== product.id && p.category_id === product.category_id),
    ...all.filter((p) => p.id !== product.id && p.category_id !== product.category_id && p.featured),
  ].slice(0, 4);

  const ld = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    sku: product.id,
    image: product.images.length ? product.images.map((i) => i.image_url) : [`${site.url}/og.png`],
    category: product.category?.name,
    brand: { "@type": "Brand", name: "Minerva" },
    offers: {
      "@type": "Offer",
      url: `${site.url}/productos/${product.slug}`,
      priceCurrency: "CLP",
      price: product.price,
      availability: product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
      seller: { "@type": "Organization", name: "Minerva" },
    },
  };
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Inicio", item: site.url },
      { "@type": "ListItem", position: 2, name: "Productos", item: `${site.url}/productos` },
      { "@type": "ListItem", position: 3, name: product.name, item: `${site.url}/productos/${product.slug}` },
    ],
  };

  return (
    <div className="pt-24 md:pt-28">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify([ld, breadcrumbLd]) }} />
      <nav aria-label="Ruta de navegación" className="container-x">
        <ol className="flex flex-wrap items-center gap-1.5 text-sm text-ink-soft">
          <li>
            <Link href="/" className="hover:text-ink">
              Inicio
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li>
            <Link href="/productos" className="hover:text-ink">
              Productos
            </Link>
          </li>
          {product.category && (
            <>
              <li aria-hidden>/</li>
              <li>
                <Link href={`/productos?categoria=${product.category.slug}`} className="hover:text-ink">
                  {product.category.name}
                </Link>
              </li>
            </>
          )}
        </ol>
      </nav>

      <ProductDetail product={product} />

      {related.length > 0 && (
        <section aria-labelledby="related-title" className="container-x py-20">
          <div className="flex items-end justify-between gap-4">
            <h2 id="related-title" className="display text-[clamp(2rem,4vw,3rem)]">
              También te puede <span className="serif-accent">gustar</span>
            </h2>
            <Link href="/productos" className="hidden items-center gap-2 font-medium hover:underline sm:flex">
              Ver todo <Icon name="arrow" size={18} />
            </Link>
          </div>
          <div data-reveal="stagger" className="mt-10 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-4 lg:gap-x-6">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
