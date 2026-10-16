import type { Metadata } from "next";
import { GiftReveal } from "@/components/gift/GiftReveal";

export const metadata: Metadata = {
  title: "Tienes un mensaje secreto",
  description: "Alguien te dejó un mensaje junto a tu regalo de Minerva.",
  robots: { index: false, follow: false },
};

export default async function GiftPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return (
    <div className="container-x pb-16 pt-28 md:pt-36">
      <GiftReveal code={decodeURIComponent(code).slice(0, 40)} />
    </div>
  );
}
