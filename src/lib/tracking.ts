import type { DeliveryStatus, OrderStatus, PaymentStatus } from "./types";

export const PAKET_TRACKING_URL = "https://track.paket.cl/";

export interface TrackedOrder {
  order_number: string;
  created_at: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  delivery_status: DeliveryStatus;
  tracking_code: string | null;
  total: number;
  subtotal: number;
  discount: number;
  shipping_cost: number;
  shipping_pending: boolean;
  document_type: "boleta" | "factura";
  document_number: string | null;
  document_url: string | null;
  items: { name: string; variant: string | null; quantity: number }[];
}

export const TRACKING_STEPS = [
  { label: "Pedido recibido", hint: "Registramos tu pedido." },
  { label: "Confirmado", hint: "Coordinamos el pago y los detalles contigo." },
  { label: "En producción", hint: "Estamos estampando y preparando tu pedido." },
  { label: "Listo para despacho", hint: "Tu pedido está terminado y embalado." },
  { label: "Enviado con Paket", hint: "Va en camino a tu dirección." },
  { label: "Entregado", hint: "Tu pedido llega a tu dirección." },
] as const;

const STATUS_RANK: Record<OrderStatus, number> = { pendiente: 0, confirmado: 1, en_produccion: 2, listo: 3, entregado: 5, cancelado: 0 };
const DELIVERY_RANK: Record<DeliveryStatus, number> = { por_coordinar: 0, preparando: 3, enviado: 4, entregado: 5 };

/** Índice del último paso completado (0 = solo recibido). */
export function trackingRank(o: Pick<TrackedOrder, "status" | "payment_status" | "delivery_status">) {
  let rank = Math.max(STATUS_RANK[o.status] ?? 0, DELIVERY_RANK[o.delivery_status] ?? 0);
  if (o.payment_status === "pagado") rank = Math.max(rank, 1);
  return rank;
}

/** Acepta "1001", "min-1001" o "MIN-1001". */
export function normalizeOrderNumber(raw: string) {
  const v = raw.trim().toUpperCase().replace(/\s+/g, "");
  return /^\d+$/.test(v) ? `MIN-${v}` : v;
}
