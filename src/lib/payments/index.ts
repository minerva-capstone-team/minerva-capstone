/**
 * Arquitectura de pagos.
 *
 * Cada pasarela implementa `PaymentProvider`. Hoy solo "whatsapp" está activa:
 * el pedido se registra y el pago se coordina por WhatsApp.
 *
 * Para activar Webpay o Mercado Pago:
 * 1. Crear una Route Handler en `src/app/api/payments/<proveedor>/route.ts` que cree
 *    la transacción con las credenciales privadas (variables de entorno SIN prefijo
 *    NEXT_PUBLIC_) y devuelva la URL de redirección.
 * 2. Crear el webhook/retorno que marque `orders.payment_status = 'pagado'` usando la
 *    service_role key SOLO en el servidor.
 * 3. Implementar `start()` abajo y poner NEXT_PUBLIC_PAYMENTS_<PROVEEDOR>=true.
 */
import type { PlacedOrder } from "../types";
import { orderMessage } from "../whatsapp";

export type PaymentMethodId = "whatsapp" | "webpay" | "mercadopago";

export interface PaymentProvider {
  id: PaymentMethodId;
  label: string;
  description: string;
  enabled: boolean;
  /** Devuelve la URL a la que se debe llevar al cliente para pagar. */
  start: (order: PlacedOrder) => Promise<string>;
}

async function startHosted(provider: "webpay" | "mercadopago", order: PlacedOrder) {
  const res = await fetch(`/api/payments/${provider}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderId: order.id }),
  });
  if (!res.ok) throw new Error("No pudimos iniciar el pago. Intenta coordinarlo por WhatsApp.");
  const { url } = (await res.json()) as { url: string };
  return url;
}

export const paymentProviders: PaymentProvider[] = [
  {
    id: "whatsapp",
    label: "Coordinar por WhatsApp",
    description: "Registramos tu pedido y te enviamos los datos de transferencia por WhatsApp.",
    enabled: true,
    start: async (order) => orderMessage(order),
  },
  {
    id: "webpay",
    label: "Webpay",
    description: "Tarjetas de débito y crédito.",
    enabled: process.env.NEXT_PUBLIC_PAYMENTS_WEBPAY === "true",
    start: (order) => startHosted("webpay", order),
  },
  {
    id: "mercadopago",
    label: "Mercado Pago",
    description: "Tarjetas de crédito y débito, o tu saldo de Mercado Pago. Pago seguro en su sitio.",
    enabled: process.env.NEXT_PUBLIC_PAYMENTS_MERCADOPAGO === "true",
    start: (order) => startHosted("mercadopago", order),
  },
];
