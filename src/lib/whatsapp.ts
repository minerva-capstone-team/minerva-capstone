import { site } from "./site";
import { formatCLP } from "./format";
import type { PlacedOrder } from "./types";

export const DEFAULT_WA_MESSAGE =
  "Hola Minerva 👋 Vi sus productos en la página web y me gustaría cotizar/personalizar un producto.";

export function waLink(message: string = DEFAULT_WA_MESSAGE) {
  return `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(message)}`;
}

/** Enlace para escribirle a un cliente (normaliza números chilenos). */
export function waTo(phone: string, message: string) {
  let digits = phone.replace(/\D/g, "");
  if (/^9\d{8}$/.test(digits)) digits = `56${digits}`;
  else if (/^\d{8}$/.test(digits)) digits = `569${digits}`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function productInquiry(name: string, extra?: string) {
  return waLink(
    `Hola Minerva 👋 Me interesa el producto "${name}" que vi en la página web.${extra ? `\n${extra}` : ""}\n¿Me pueden ayudar a cotizarlo/personalizarlo?`,
  );
}

export function orderMessage(order: PlacedOrder) {
  const lines = order.items.map((i) => {
    const custom = [i.customization?.text && `texto: "${i.customization.text}"`, i.customization?.name && `nombre: "${i.customization.name}"`, i.customization?.imageDataUrl && "incluye imagen"]
      .filter(Boolean)
      .join(", ");
    return `• ${i.quantity} × ${i.name}${i.variantName ? ` (${i.variantName})` : ""} — ${formatCLP(i.unitPrice * i.quantity)}${custom ? `\n   ↳ ${custom}` : ""}`;
  });
  const c = order.customer;
  return waLink(
    [
      `Hola Minerva 👋 Acabo de hacer el pedido *${order.order_number}* en la web.`,
      "",
      ...lines,
      "",
      order.discount > 0 ? `*Subtotal:* ${formatCLP(order.subtotal)}` : "",
      order.discount > 0 ? `*Descuento${order.coupon_code ? ` (${order.coupon_code})` : ""}:* −${formatCLP(order.discount)}` : "",
      order.shipping_pending ? "*Envío:* por coordinar" : `*Envío:* ${order.shipping_cost > 0 ? formatCLP(order.shipping_cost) : "gratis"}`,
      `*Total:* ${formatCLP(order.total)}${order.shipping_pending ? " (+ envío)" : ""}`,
      order.document_type === "factura" ? "*Documento:* Factura" : "",
      `*Nombre:* ${c.first_name} ${c.last_name}`,
      `*Entrega:* ${c.address}, ${c.comuna}, ${c.region}`,
      c.notes ? `*Notas:* ${c.notes}` : "",
      "",
      "¿Me confirman el pago y el despacho? ¡Gracias!",
    ]
      .filter((l) => l !== "")
      .join("\n"),
  );
}
