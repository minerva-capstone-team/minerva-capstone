/** Clasificación simple por palabras clave de lo que preguntan las clientas (sin IA, sin costo). */
export const TOPICS = [
  { id: "precio", label: "Precios", re: /precio|cu[aá]nto (sale|cuesta|vale)|valor|cuesta|\$\s?\d/i },
  { id: "envio", label: "Envíos y despacho", re: /env[ií]o|despach|llega|regi[oó]n|comuna|delivery|retiro|paket/i },
  { id: "plazo", label: "Plazos de entrega", re: /demora|tarda|plazo|cu[aá]ndo|d[ií]as|semana|para el (lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo)|urgente/i },
  { id: "personalizacion", label: "Personalización", re: /personaliz|nombre|foto|dise[ñn]o|texto|imagen|logo|frase|letra/i },
  { id: "pago", label: "Pagos", re: /pag(o|ar)|transferencia|tarjeta|webpay|cuotas|mercado ?pago|efectivo/i },
  { id: "stock", label: "Disponibilidad", re: /disponible|stock|quedan|hay |tienen|todav[ií]a/i },
  { id: "pedido", label: "Estado de un pedido", re: /mi pedido|seguimiento|n[uú]mero de pedido|min-\d+|lleg[oó] mi|orden/i },
  { id: "mayor", label: "Por mayor y eventos", re: /mayor|cantidad|evento|empresa|matrimonio|cumplea[ñn]os|baby shower|souvenir|\b\d{2,}\s?(tazas|unidades)/i },
] as const;

export type TopicId = (typeof TOPICS)[number]["id"] | "otro";

export function topicsOf(question: string): TopicId[] {
  const found = TOPICS.filter((t) => t.re.test(question)).map((t) => t.id);
  return found.length ? found : ["otro"];
}

export const topicLabel = (id: TopicId) => (id === "otro" ? "Otros" : TOPICS.find((t) => t.id === id)!.label);
