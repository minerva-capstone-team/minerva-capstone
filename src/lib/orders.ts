"use client";
import { dataUrlToBlob } from "./images";
import { getBrowserSupabase } from "./supabase/client";
import { UPLOADS_BUCKET } from "./supabase/config";
import type { CartItem, CheckoutCustomer, PlacedOrder } from "./types";

const ORDERS_KEY = "minerva-orders";

export function getLocalOrders(): PlacedOrder[] {
  try {
    return JSON.parse(localStorage.getItem(ORDERS_KEY) ?? "[]") as PlacedOrder[];
  } catch {
    return [];
  }
}

export function getLocalOrder(orderNumber: string) {
  return getLocalOrders().find((o) => o.order_number === orderNumber) ?? null;
}

function saveLocalOrder(order: PlacedOrder) {
  // Las imágenes ya viajaron a Storage (o se enviarán por WhatsApp); no se guardan para no llenar localStorage.
  const slim: PlacedOrder = {
    ...order,
    items: order.items.map((i) =>
      i.customization?.imageDataUrl ? { ...i, customization: { ...i.customization, imageDataUrl: "attached" } } : i,
    ),
  };
  try {
    localStorage.setItem(ORDERS_KEY, JSON.stringify([slim, ...getLocalOrders()].slice(0, 20)));
  } catch {
    /* almacenamiento lleno o bloqueado: el pedido igual quedó registrado/listo para WhatsApp */
  }
}

const localNumber = () => `MIN-${Date.now().toString(36).slice(-5).toUpperCase()}`;

/**
 * Registra el pedido. Con Supabase usa la función `create_order` (SECURITY DEFINER),
 * que recalcula precios desde la base de datos: el navegador nunca fija precios.
 */
export async function placeOrder(items: CartItem[], customer: CheckoutCustomer, paymentMethod: string): Promise<PlacedOrder> {
  const sb = getBrowserSupabase();
  let id: string = crypto.randomUUID();
  let orderNumber = localNumber();
  let total = items.reduce((n, i) => n + i.unitPrice * i.quantity, 0);
  let synced = false;

  if (sb) {
    const folder = crypto.randomUUID();
    const payloadItems = await Promise.all(
      items.map(async (item, index) => {
        let image_path: string | null = null;
        const dataUrl = item.customization?.imageDataUrl;
        if (dataUrl) {
          const blob = dataUrlToBlob(dataUrl);
          const ext = blob.type === "image/webp" ? "webp" : "jpg";
          const path = `${folder}/${index}.${ext}`;
          const { error } = await sb.storage.from(UPLOADS_BUCKET).upload(path, blob, { contentType: blob.type });
          if (error) throw new Error("No pudimos subir tu imagen de personalización. Intenta nuevamente.");
          image_path = path;
        }
        return {
          product_id: item.productId,
          variant_id: item.variantId,
          quantity: item.quantity,
          customization: item.customization
            ? { text: item.customization.text ?? null, name: item.customization.name ?? null, image_path }
            : null,
        };
      }),
    );

    const { data, error } = await sb.rpc("create_order", {
      payload: { customer, items: payloadItems, payment_method: paymentMethod },
    });
    if (error) {
      const msg = error.message.includes("stock")
        ? "Uno de los productos ya no tiene stock suficiente. Revisa tu carrito."
        : error.message.includes("product")
          ? "Algún producto del carrito ya no está disponible. Revisa tu carrito."
          : "No pudimos registrar el pedido. Intenta nuevamente o escríbenos por WhatsApp.";
      throw new Error(msg);
    }
    const res = data as { id: string; order_number: string; total: number };
    id = res.id;
    orderNumber = res.order_number;
    total = Number(res.total);
    synced = true;
    // Email de confirmación (Resend). No bloquea el checkout: si falla, el pedido igual quedó registrado.
    void fetch("/api/order-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: id }),
      keepalive: true,
    }).catch(() => {});
  }

  const order: PlacedOrder = {
    id,
    order_number: orderNumber,
    total,
    created_at: new Date().toISOString(),
    customer,
    payment_method: paymentMethod,
    synced,
    items: items.map((i) => ({
      name: i.name,
      variantName: i.variantName,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      customization: i.customization,
    })),
  };
  saveLocalOrder(order);
  return order;
}
