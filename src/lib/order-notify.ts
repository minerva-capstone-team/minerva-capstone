import { site } from "./site";
import { PAKET_TRACKING_URL } from "./tracking";
import type { DeliveryStatus, OrderStatus } from "./types";

export type NotifyKind = "status" | "shipping";

export interface NotifyOrder {
  order_number: string;
  status: OrderStatus;
  delivery_status: DeliveryStatus;
  tracking_code: string | null;
}

export interface OrderNotice {
  subject: string;
  headline: string;
  body: string;
  /** Código de seguimiento de Paket (solo en el aviso de despacho). */
  code?: string;
}

/** Mensaje para el cliente según el estado actual del pedido. null = no corresponde avisar. */
export function noticeFor(kind: NotifyKind, o: NotifyOrder): OrderNotice | null {
  const n = o.order_number;
  if (kind === "shipping") {
    if (o.delivery_status !== "enviado" || !o.tracking_code) return null;
    return {
      subject: `Tu pedido ${n} va en camino · ${site.name}`,
      headline: "¡Tu pedido va en camino!",
      body: `Despachamos tu pedido ${n} con Paket. Tu número de seguimiento es ${o.tracking_code}. Copia el código y pégalo en ${PAKET_TRACKING_URL} para ver dónde va tu paquete.`,
      code: o.tracking_code,
    };
  }
  switch (o.status) {
    case "confirmado":
      return { subject: `Confirmamos tu pedido ${n} · ${site.name}`, headline: "¡Tu pedido está confirmado!", body: `Ya coordinamos los detalles de tu pedido ${n}. Pronto empezamos a prepararlo.` };
    case "en_produccion":
      return { subject: `Estamos preparando tu pedido ${n} · ${site.name}`, headline: "Estamos preparando tu pedido", body: `Tu pedido ${n} ya está en producción: lo estamos estampando y armando con cariño.` };
    case "listo":
      return { subject: `Tu pedido ${n} está listo · ${site.name}`, headline: "Tu pedido está listo", body: `Tu pedido ${n} está terminado y embalado. Te avisaremos apenas salga a despacho.` };
    case "entregado":
      return { subject: `Entregamos tu pedido ${n} · ${site.name}`, headline: "Tu pedido fue entregado", body: `Marcamos tu pedido ${n} como entregado. ¡Esperamos que lo disfrutes! Si algo no llegó bien, escríbenos por WhatsApp.` };
    case "cancelado":
      return { subject: `Tu pedido ${n} fue cancelado · ${site.name}`, headline: "Tu pedido fue cancelado", body: `El pedido ${n} fue cancelado. Si no lo esperabas o tienes dudas, escríbenos por WhatsApp.` };
    default:
      return null;
  }
}

export const trackingUrl = (orderNumber: string) => `${site.url}/seguimiento?pedido=${encodeURIComponent(orderNumber)}`;

/** Texto listo para mandar por WhatsApp. */
export function whatsappNotice(firstName: string, notice: OrderNotice, orderNumber: string) {
  return `Hola ${firstName} 👋 ${notice.headline}\n\n${notice.body}\n\nPuedes revisar el estado aquí: ${trackingUrl(orderNumber)}`;
}
