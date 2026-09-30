"use client";
import { dataUrlToBlob } from "./images";
import { getBrowserSupabase } from "./supabase/client";
import { UPLOADS_BUCKET } from "./supabase/config";
import type { BillingData, CartItem, CheckoutCustomer, DocumentType, PlacedOrder } from "./types";

export interface PlaceOrderOptions {
  coupon?: string;
  documentType?: DocumentType;
  billing?: BillingData | null;
}

function friendlyOrderError(message: string) {
  if (message.includes("too many pending")) return "Tienes varios pedidos pendientes de pago. Coordina el pago de esos pedidos o escríbenos por WhatsApp.";
  if (message.includes("coupon")) return "El cupón ya no es válido. Quítalo o prueba con otro.";
  if (message.includes("billing")) return "Revisa los datos de facturación (RUT, razón social, giro y dirección).";
  if (message.includes("stock")) return "Uno de los productos ya no tiene stock suficiente. Revisa tu carrito.";
  if (message.includes("product")) return "Algún producto del carrito ya no está disponible. Revisa tu carrito.";
  return "No pudimos registrar el pedido. Intenta nuevamente o escríbenos por WhatsApp.";
}

const ORDERS_KEY = "minerva-orders";

export function getLocalOrders(): PlacedOrder[] {
  try {
    const list = JSON.parse(localStorage.getItem(ORDERS_KEY) ?? "[]") as PlacedOrder[];
    // Pedidos guardados antes de existir descuento/envío/documento.
    return list.map((o) => ({
      ...o,
      subtotal: o.subtotal ?? o.total,
      discount: o.discount ?? 0,
      shipping_cost: o.shipping_cost ?? 0,
      shipping_pending: o.shipping_pending ?? true,
      coupon_code: o.coupon_code ?? null,
      document_type: o.document_type ?? "boleta",
    }));
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
export async function placeOrder(
  items: CartItem[],
  customer: CheckoutCustomer,
  paymentMethod: string,
  options: PlaceOrderOptions = {},
): Promise<PlacedOrder> {
  const sb = getBrowserSupabase();
  const documentType = options.documentType ?? "boleta";
  let id: string = crypto.randomUUID();
  let orderNumber = localNumber();
  let subtotal = items.reduce((n, i) => n + i.unitPrice * i.quantity, 0);
  let total = subtotal;
  let discount = 0;
  let shippingCost = 0;
  let shippingPending = true;
  let couponCode: string | null = null;
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

    const coupon = options.coupon?.trim() || null;
    const { data, error } = await sb.rpc("create_order", {
      payload: {
        customer,
        items: payloadItems,
        payment_method: paymentMethod,
        coupon,
        document_type: documentType,
        billing: documentType === "factura" ? options.billing : null,
      },
    });
    if (error) throw new Error(friendlyOrderError(error.message));
    const res = data as { id: string; order_number: string; total: number; subtotal: number; discount: number; shipping_cost: number; shipping_pending: boolean };
    id = res.id;
    orderNumber = res.order_number;
    total = Number(res.total);
    subtotal = Number(res.subtotal);
    discount = Number(res.discount);
    shippingCost = Number(res.shipping_cost);
    shippingPending = Boolean(res.shipping_pending);
    couponCode = discount > 0 ? coupon?.toUpperCase() ?? null : null;
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
    subtotal,
    discount,
    shipping_cost: shippingCost,
    shipping_pending: shippingPending,
    coupon_code: couponCode,
    document_type: documentType,
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
