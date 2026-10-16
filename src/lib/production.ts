/** Suma días hábiles (lunes a viernes). No considera feriados. */
export function addBusinessDays(from: Date, days: number) {
  const d = new Date(from);
  let added = 0;
  while (added < days) {
    d.setDate(d.getDate() + 1);
    const w = d.getDay();
    if (w !== 0 && w !== 6) added++;
  }
  return d;
}

export type DueState = "done" | "late" | "today" | "soon" | "ok";

/** Fecha comprometida = fecha del pedido + los días de preparación del producto más lento. */
export function dueInfo(createdAt: string, prepDays: number[], status: string) {
  const due = addBusinessDays(new Date(createdAt), Math.max(1, ...prepDays.filter((n) => n > 0)));
  due.setHours(23, 59, 59, 999);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.floor((due.getTime() - today.getTime()) / 86_400_000);
  const state: DueState = status === "listo" || status === "entregado" ? "done" : diff < 0 ? "late" : diff === 0 ? "today" : diff <= 2 ? "soon" : "ok";
  const label =
    state === "done" ? "Terminado" : state === "late" ? `Atrasado ${-diff} día${diff === -1 ? "" : "s"}` : state === "today" ? "Vence hoy" : `Vence en ${diff} día${diff === 1 ? "" : "s"}`;
  return { due, state, label };
}

export const DUE_STYLE: Record<DueState, string> = {
  done: "bg-m-green/15 text-[#1c6b51]",
  late: "bg-m-red/12 text-[#b42318]",
  today: "bg-m-yellow/25 text-[#8a5a00]",
  soon: "bg-m-yellow/15 text-[#8a5a00]",
  ok: "bg-paper text-ink-2",
};
export const DUE_ICON: Record<DueState, string> = { done: "✓", late: "!", today: "◷", soon: "◷", ok: "◷" };

export const PROOF_LABEL: Record<string, { text: string; cls: string }> = {
  pendiente: { text: "Diseño: esperando aprobación", cls: "bg-m-blue/12 text-[#1d5f86]" },
  cambios: { text: "Diseño: pidió cambios", cls: "bg-m-red/12 text-[#b42318]" },
  aprobado: { text: "Diseño aprobado", cls: "bg-m-green/15 text-[#1c6b51]" },
};
