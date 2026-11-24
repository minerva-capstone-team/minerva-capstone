import type { DeliveryStatus, OrderStatus, PaymentStatus } from "./types";

export const orderStatusLabel = {
  status: {
    pendiente: "Pendiente",
    confirmado: "Pagado",
    en_produccion: "En producción",
    listo: "Listo",
    entregado: "Entregado",
    cancelado: "Anulado",
  } satisfies Record<OrderStatus, string>,
  payment: { pendiente: "Pago pendiente", pagado: "Pagado", reembolsado: "Reembolsado" } satisfies Record<PaymentStatus, string>,
  delivery: { por_coordinar: "Por coordinar", preparando: "Preparando", enviado: "Enviado", entregado: "Entregado" } satisfies Record<DeliveryStatus, string>,
};
