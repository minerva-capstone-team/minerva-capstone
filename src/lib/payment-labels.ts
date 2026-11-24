/** Textos para mostrar cómo se pagó un pedido (Mercado Pago). */
export const PAYMENT_TYPE_LABEL: Record<string, string> = {
  credit_card: "Tarjeta de crédito",
  debit_card: "Tarjeta de débito",
  prepaid_card: "Tarjeta prepago",
  account_money: "Saldo de Mercado Pago",
  bank_transfer: "Transferencia bancaria",
  ticket: "Pago en efectivo",
  atm: "Cajero / pago en efectivo",
  digital_currency: "Crédito de Mercado Pago",
};

const BRAND_LABEL: Record<string, string> = {
  visa: "Visa", master: "Mastercard", amex: "American Express", diners: "Diners", magna: "Magna", debvisa: "Visa Débito", debmaster: "Mastercard Débito",
  redcompra: "Redcompra", account_money: "Mercado Pago", consumer_credits: "Crédito Mercado Pago",
};

export const paymentTypeLabel = (t?: string | null) => (t ? PAYMENT_TYPE_LABEL[t] ?? t : null);
export const paymentBrandLabel = (b?: string | null) => (b ? BRAND_LABEL[b] ?? b.charAt(0).toUpperCase() + b.slice(1) : null);

/** Ej: "Tarjeta de crédito Visa ****1234, 3 cuotas". */
export function paymentSummary(p: { payment_type_id?: string | null; payment_method_id?: string | null; installments?: number | null; card?: { last_four_digits?: string | null } | null }) {
  const parts = [paymentTypeLabel(p.payment_type_id), paymentBrandLabel(p.payment_method_id), p.card?.last_four_digits ? `****${p.card.last_four_digits}` : null]
    .filter(Boolean)
    .join(" ");
  const cuotas = p.installments && p.installments > 1 ? `, ${p.installments} cuotas` : p.payment_type_id === "credit_card" ? ", 1 cuota" : "";
  return (parts || "Mercado Pago") + cuotas;
}
