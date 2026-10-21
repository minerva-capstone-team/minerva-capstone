import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProduct } from "@/lib/catalog";
import { QuickBuy } from "@/components/cart/QuickBuy";

// Enlace de compra rápida: no es una página para buscadores.
export const metadata: Metadata = { title: "Preparando tu pedido", robots: { index: false, follow: false } };

export default async function QuickBuyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();
  return <QuickBuy product={product} />;
}
