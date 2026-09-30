import "server-only";
import { Resend } from "resend";
import { formatCLP } from "./format";
import { site } from "./site";

const apiKey = process.env.RESEND_API_KEY ?? "";
/** Remitente. Con `onboarding@resend.dev` Resend solo entrega a tu propio correo: verifica un dominio para enviar a clientes. */
const from = process.env.RESEND_FROM || `${site.name} <onboarding@resend.dev>`;
/** Correo de la tienda que recibe un aviso por cada pedido nuevo (opcional). */
const notifyTo = process.env.ORDER_NOTIFY_EMAIL ?? "";

export const isEmailConfigured = Boolean(apiKey);

export interface OrderEmailData {
  order_number: string;
  total: number;
  payment_method: string;
  notes: string | null;
  customer: { first_name: string; last_name: string; email: string; phone: string; address: string; comuna: string; region: string };
  items: { name: string; variant: string | null; quantity: number; unit_price: number; customized: boolean }[];
}

const esc = (s: string | null | undefined) =>
  (s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function itemsTable(o: OrderEmailData) {
  const rows = o.items
    .map(
      (i) => `<tr>
  <td style="padding:8px 0;border-bottom:1px solid #eee">${i.quantity} × ${esc(i.name)}${i.variant ? ` <span style="color:#777">(${esc(i.variant)})</span>` : ""}${i.customized ? ` <span style="color:#7c3aed">· Personalizado</span>` : ""}</td>
  <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;white-space:nowrap">${formatCLP(i.unit_price * i.quantity)}</td>
</tr>`,
    )
    .join("");
  return `<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:14px">${rows}
<tr><td style="padding:12px 0;font-weight:bold">Total productos</td><td style="padding:12px 0;text-align:right;font-weight:bold">${formatCLP(o.total)}</td></tr></table>`;
}

const wrap = (body: string) =>
  `<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1a1a1a;line-height:1.5">${body}
<p style="margin-top:32px;font-size:12px;color:#888">${esc(site.fullName)} · <a href="${site.url}" style="color:#888">${site.url.replace(/^https?:\/\//, "")}</a></p></div>`;

function customerHtml(o: OrderEmailData) {
  const wa = `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(`Hola! Quiero coordinar mi pedido ${o.order_number}`)}`;
  return wrap(`<h1 style="font-size:22px;margin:0 0 8px">¡Gracias por tu pedido, ${esc(o.customer.first_name)}!</h1>
<p style="margin:0 0 20px">Recibimos tu pedido <strong>${esc(o.order_number)}</strong>. Te contactaremos por WhatsApp para coordinar el pago y el envío.</p>
${itemsTable(o)}
<p style="margin:20px 0 4px;font-weight:bold">Entrega</p>
<p style="margin:0">${esc(o.customer.address)}, ${esc(o.customer.comuna)}, ${esc(o.customer.region)}</p>
<p style="margin:24px 0"><a href="${wa}" style="background:#1a1a1a;color:#fff;padding:12px 20px;border-radius:999px;text-decoration:none;display:inline-block">Coordinar por WhatsApp</a></p>
<p style="font-size:13px;color:#555">¿Dudas? Escríbenos al ${esc(site.whatsappDisplay)}.</p>`);
}

function storeHtml(o: OrderEmailData) {
  const c = o.customer;
  return wrap(`<h1 style="font-size:20px;margin:0 0 12px">Nuevo pedido ${esc(o.order_number)}</h1>
<p style="margin:0 0 16px">${esc(c.first_name)} ${esc(c.last_name)} · ${esc(c.email)} · ${esc(c.phone)}<br>${esc(c.address)}, ${esc(c.comuna)}, ${esc(c.region)}<br>Pago: ${esc(o.payment_method)}</p>
${o.notes ? `<p style="margin:0 0 16px;padding:12px;background:#f6f6f6;border-radius:8px">${esc(o.notes)}</p>` : ""}
${itemsTable(o)}
<p style="margin-top:20px"><a href="${site.url}/admin/pedidos">Ver en el panel</a></p>`);
}

export async function sendOrderEmails(o: OrderEmailData) {
  const resend = new Resend(apiKey);
  const jobs = [
    resend.emails.send({
      from,
      to: o.customer.email,
      subject: `Recibimos tu pedido ${o.order_number} · ${site.name}`,
      html: customerHtml(o),
    }),
  ];
  if (notifyTo) {
    jobs.push(
      resend.emails.send({
        from,
        to: notifyTo,
        replyTo: o.customer.email,
        subject: `Nuevo pedido ${o.order_number} · ${formatCLP(o.total)}`,
        html: storeHtml(o),
      }),
    );
  }
  const results = await Promise.all(jobs);
  return results.map((r) => r.error).filter(Boolean);
}
