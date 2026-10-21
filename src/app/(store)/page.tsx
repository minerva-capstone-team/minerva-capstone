import { getCategories, getProducts } from "@/lib/catalog";
import { Hero } from "@/components/home/Hero";
import { Marquee } from "@/components/home/Marquee";
import { Categories } from "@/components/home/Categories";
import { ProductsSection } from "@/components/home/ProductsSection";
import { HazloTuyo } from "@/components/home/HazloTuyo";
import { Editorial } from "@/components/home/Editorial";
import { Favorites } from "@/components/home/Favorites";
import { Social } from "@/components/home/Social";
import { About } from "@/components/home/About";
import { Faq } from "@/components/home/Faq";
import { Contact } from "@/components/home/Contact";
import { SeasonSpotlight } from "@/components/home/SeasonSpotlight";

export default async function HomePage() {
  const [products, categories] = await Promise.all([getProducts(), getCategories()]);

  const counts: Record<string, number> = {};
  for (const p of products) if (p.category_id) counts[p.category_id] = (counts[p.category_id] ?? 0) + 1;

  const featured = products.filter((p) => p.featured);
  const favorites = [...products.filter((p) => p.badge === "mas-vendido"), ...featured.filter((p) => p.badge !== "mas-vendido")].slice(0, 8);
  const editorial = [...featured].sort((a, b) => Number(b.customizable) - Number(a.customizable)).slice(0, 4);

  return (
    <>
      <Hero />
      <Marquee />
      <Categories categories={categories} counts={counts} />
      <SeasonSpotlight products={products} />
      <ProductsSection products={products} />
      <HazloTuyo />
      <Editorial products={editorial} />
      <Favorites products={favorites.length ? favorites : products.slice(0, 8)} />
      <About />
      <Social />
      <Faq />
      <Contact />
    </>
  );
}
