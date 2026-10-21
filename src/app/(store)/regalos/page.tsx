import type { Metadata } from "next";
import { getProducts } from "@/lib/catalog";
import { GiftFinder } from "@/components/gift/GiftFinder";

export const metadata: Metadata = {
  title: "Encuentra el regalo perfecto",
  description: "Dinos para quién es el regalo y cuánto quieres gastar: te mostramos ideas personalizables de Minerva con stock disponible.",
  alternates: { canonical: "/regalos" },
};

export default async function GiftsPage() {
  const products = await getProducts();
  return (
    <div className="container-x pb-16 pt-32 md:pt-40">
      <header className="mx-auto max-w-3xl text-center">
        <p className="eyebrow">Armador de regalos</p>
        <h1 className="display mt-4 text-[clamp(2.5rem,6vw,4.5rem)]">
          Encuentra el <span className="serif-accent text-gradient">regalo perfecto</span>
        </h1>
        <p className="mt-4 text-lg text-ink-soft">Dos preguntas y te mostramos ideas reales, con stock y precio.</p>
      </header>
      <GiftFinder products={products} />
    </div>
  );
}
