import type { Metadata } from "next";
import { getProducts } from "@/lib/catalog";
import Image from "next/image";
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
      <div className="relative mx-auto mt-10 aspect-[21/9] max-w-5xl overflow-hidden rounded-[1.75rem]">
        <Image src="/fotos/09-armador-regalos.webp" alt="Manos armando una caja de regalo con una taza, una libreta y chocolates" fill sizes="(min-width: 1024px) 64rem, 100vw" className="object-cover" />
      </div>
      <GiftFinder products={products} />
    </div>
  );
}
