import type { Metadata } from "next";
import { OrderTracker } from "@/components/tracking/OrderTracker";

export const metadata: Metadata = {
  title: "Seguimiento de pedido",
  description: "Revisa en qué etapa va tu pedido de Minerva y consulta tu número de seguimiento de Paket.",
  robots: { index: false },
};

export default async function TrackingPage({ searchParams }: { searchParams: Promise<{ pedido?: string }> }) {
  const { pedido } = await searchParams;
  return (
    <div className="container-x pb-12 pt-28 md:pt-36">
      <div className="text-center">
        <p className="eyebrow justify-center">Seguimiento</p>
        <h1 className="display mt-4 text-[clamp(2.5rem,6vw,4.5rem)]">
          ¿Dónde va <span className="serif-accent text-gradient">mi pedido?</span>
        </h1>
        <p className="mx-auto mt-4 max-w-md text-lg text-ink-soft">Ingresa tu número de pedido y el email que usaste al comprar.</p>
      </div>
      <OrderTracker initialOrder={(pedido ?? "").slice(0, 30)} />
    </div>
  );
}
