"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getLocalOrder } from "@/lib/orders";
import { orderMessage, waLink } from "@/lib/whatsapp";
import { formatCLP } from "@/lib/format";
import type { PlacedOrder } from "@/lib/types";
import { Icon, WhatsAppIcon } from "@/components/ui/Icon";

export function OrderConfirmation({ orderNumber }: { orderNumber: string }) {
  const [order, setOrder] = useState<PlacedOrder | null | undefined>(undefined);
  useEffect(() => setOrder(getLocalOrder(orderNumber)), [orderNumber]);

  if (order === undefined) {
    return <div className="skeleton mx-auto h-96 max-w-2xl rounded-[2rem]" aria-busy="true" aria-label="Cargando pedido" />;
  }

  if (order === null) {
    return (
      <div className="mx-auto max-w-xl rounded-[2rem] bg-white p-10 text-center shadow-[var(--shadow-soft)]">
        <h1 className="display text-3xl">Pedido {orderNumber}</h1>
        <p className="mt-3 text-ink-soft">No encontramos el detalle de este pedido en este dispositivo. Escríbenos y te ayudamos con su estado.</p>
        <a href={waLink(`Hola Minerva 👋 Quiero consultar por mi pedido ${orderNumber}.`)} target="_blank" rel="noopener noreferrer" className="btn btn-wa mt-6">
          <WhatsAppIcon /> Consultar por WhatsApp
        </a>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="text-center">
        <span className="bg-gradient-minerva mx-auto grid size-20 animate-[fade-up_0.8s_var(--ease-out-expo)] place-items-center rounded-full text-white shadow-lg">
          <Icon name="check" size={36} strokeWidth={2.2} />
        </span>
        <p className="eyebrow mt-8 justify-center">Pedido {order.order_number}</p>
        <h1 className="display mt-4 text-[clamp(2.5rem,6vw,4rem)]">
          ¡Gracias, <span className="serif-accent text-gradient">{order.customer.first_name}!</span>
        </h1>
        <p className="mx-auto mt-4 max-w-md text-lg text-ink-soft">
          Recibimos tu pedido. El último paso es coordinar el pago y el envío por WhatsApp — te enviamos todo listo.
        </p>
        <a href={orderMessage(order)} target="_blank" rel="noopener noreferrer" className="btn btn-wa mt-8 h-14 px-8 text-base">
          <WhatsAppIcon /> Coordinar pago por WhatsApp
        </a>
      </div>

      <div className="mt-12 rounded-[2rem] bg-white p-6 shadow-[var(--shadow-soft)] sm:p-8">
        <h2 className="display text-2xl">Resumen</h2>
        <ul className="mt-5 divide-y divide-line">
          {order.items.map((i, idx) => (
            <li key={idx} className="flex justify-between gap-4 py-3 text-sm">
              <span>
                <span className="font-medium">
                  {i.quantity} × {i.name}
                </span>
                {i.variantName && <span className="block text-ink-soft">{i.variantName}</span>}
                {i.customization && (
                  <span className="block text-m-violet">
                    {[i.customization.name && `“${i.customization.name}”`, i.customization.text && `“${i.customization.text}”`, i.customization.imageDataUrl && "con imagen"]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                )}
              </span>
              <span className="font-semibold tabular-nums">{formatCLP(i.unitPrice * i.quantity)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex items-baseline justify-between border-t border-line pt-4">
          <span className="font-semibold">Total productos</span>
          <span className="display text-2xl tabular-nums">{formatCLP(order.total)}</span>
        </div>
        <p className="mt-4 text-sm text-ink-soft">
          Entrega: {order.customer.address}, {order.customer.comuna}, {order.customer.region}
        </p>
      </div>

      <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
        <Link href="/productos" className="btn btn-ghost">
          Seguir comprando
        </Link>
        <Link href={`/seguimiento?pedido=${encodeURIComponent(order.order_number)}`} className="btn btn-ghost">
          Seguir mi pedido
        </Link>
        <Link href="/cuenta" className="btn btn-ghost">
          Ver mis pedidos
        </Link>
      </div>
    </div>
  );
}
