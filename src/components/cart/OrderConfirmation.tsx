"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getLocalOrder } from "@/lib/orders";
import { paymentProviders } from "@/lib/payments";
import { orderMessage, waLink } from "@/lib/whatsapp";
import { formatCLP } from "@/lib/format";
import type { PlacedOrder } from "@/lib/types";
import { Icon, WhatsAppIcon } from "@/components/ui/Icon";

export function OrderConfirmation({ orderNumber }: { orderNumber: string }) {
  const [order, setOrder] = useState<PlacedOrder | null | undefined>(undefined);
  // Resultado que entrega Mercado Pago al volver: ?pago=ok | pendiente | error
  const [pago, setPago] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  useEffect(() => {
    setOrder(getLocalOrder(orderNumber));
    setPago(new URLSearchParams(window.location.search).get("pago"));
  }, [orderNumber]);

  const payAgain = async (o: PlacedOrder) => {
    setRetrying(true);
    try {
      window.location.href = await paymentProviders.find((p) => p.id === "mercadopago")!.start(o);
    } catch {
      setRetrying(false);
      window.open(orderMessage(o), "_blank", "noopener,noreferrer");
    }
  };

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
        {pago === "ok" ? (
          <p className="mx-auto mt-4 max-w-md text-lg text-ink-soft">
            <strong className="text-[#1c6b51]">¡Pago recibido con Mercado Pago!</strong> Confirmamos tu pedido y te avisaremos por correo cada avance.
            {order.shipping_pending && " El costo de envío a tu región lo coordinamos por WhatsApp."}
          </p>
        ) : pago === "pendiente" ? (
          <p className="mx-auto mt-4 max-w-md text-lg text-ink-soft">
            Tu pago está <strong>en proceso</strong> en Mercado Pago. Apenas se acredite confirmamos tu pedido y te avisamos por correo.
          </p>
        ) : pago === "error" || (order.payment_method === "mercadopago" && !pago) ? (
          <>
            <p className="mx-auto mt-4 max-w-md text-lg text-ink-soft">
              {pago === "error" ? "El pago no se completó. Tu pedido sigue reservado: puedes intentarlo de nuevo o coordinarlo por WhatsApp." : "Tu pedido está reservado. Falta el pago."}
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <button type="button" className="btn btn-primary h-14 px-8 text-base" disabled={retrying} onClick={() => void payAgain(order)}>
                {retrying ? "Abriendo Mercado Pago…" : "Pagar con Mercado Pago"}
              </button>
              <a href={orderMessage(order)} target="_blank" rel="noopener noreferrer" className="btn btn-wa h-14 px-8 text-base">
                <WhatsAppIcon /> Coordinar por WhatsApp
              </a>
            </div>
          </>
        ) : (
          <>
            <p className="mx-auto mt-4 max-w-md text-lg text-ink-soft">
              Recibimos tu pedido. El último paso es coordinar el pago y el envío por WhatsApp — te enviamos todo listo.
            </p>
            <a href={orderMessage(order)} target="_blank" rel="noopener noreferrer" className="btn btn-wa mt-8 h-14 px-8 text-base">
              <WhatsAppIcon /> Coordinar pago por WhatsApp
            </a>
          </>
        )}
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
        <dl className="mt-4 space-y-2 border-t border-line pt-4 text-sm">
          <div className="flex justify-between">
            <dt className="text-ink-soft">Subtotal</dt>
            <dd className="tabular-nums">{formatCLP(order.subtotal)}</dd>
          </div>
          {order.discount > 0 && (
            <div className="flex justify-between text-[#1c6b51]">
              <dt>Descuento{order.coupon_code ? ` (${order.coupon_code})` : ""}</dt>
              <dd className="tabular-nums">−{formatCLP(order.discount)}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="text-ink-soft">Envío</dt>
            <dd className="tabular-nums">
              {order.shipping_pending ? "Se coordina por WhatsApp" : order.shipping_cost > 0 ? formatCLP(order.shipping_cost) : "Gratis"}
            </dd>
          </div>
          <div className="flex items-baseline justify-between border-t border-line pt-3">
            <dt className="font-semibold">Total{order.shipping_pending ? " (sin envío)" : ""}</dt>
            <dd className="display text-2xl tabular-nums">{formatCLP(order.total)}</dd>
          </div>
          <div className="flex justify-between text-ink-soft">
            <dt>Documento</dt>
            <dd>{order.document_type === "factura" ? "Factura" : "Boleta"}</dd>
          </div>
        </dl>
        {order.gift && (
          <p className="mt-4 rounded-2xl bg-m-magenta/10 p-4 text-sm text-ink-2">
            Incluiremos en el paquete una tarjeta con un código QR para que quien reciba el regalo lea tu mensaje secreto.
          </p>
        )}
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
