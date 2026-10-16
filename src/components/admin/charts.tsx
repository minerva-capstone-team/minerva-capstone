"use client";
import { useState } from "react";
import { cn } from "@/lib/format";

/** Paleta validada (categórica slot 1 y 2) y tinta del gráfico. */
export const VIZ = {
  s1: "#2a78d6",
  s2: "#eb6834",
  grid: "#e1e0d9",
  muted: "#898781",
  ink: "#0b0b0b",
  ink2: "#52514e",
  seq: ["#cde2fb", "#b7d3f6", "#9ec5f4", "#86b6ef", "#6da7ec", "#5598e7", "#3987e5", "#2a78d6", "#256abf", "#1c5cab", "#184f95"],
};

export function StatTile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-3xl bg-white p-5 shadow-[var(--shadow-soft)]">
      <p className="text-sm text-ink-soft">{label}</p>
      <p className="display mt-1 text-3xl">{value}</p>
      {hint && <p className="mt-1 text-xs text-ink-soft">{hint}</p>}
    </div>
  );
}

export function ChartCard({ title, subtitle, children, action, className }: { title: string; subtitle?: string; children: React.ReactNode; action?: React.ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-3xl bg-white p-6 shadow-[var(--shadow-soft)]", className)}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="display text-xl">{title}</h2>
          {subtitle && <p className="mt-0.5 text-sm text-ink-soft">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function Tooltip({ tip }: { tip: { x: number; y: number; text: string } | null }) {
  if (!tip) return null;
  return (
    <div
      role="tooltip"
      className="pointer-events-none absolute z-20 max-w-64 -translate-x-1/2 -translate-y-full whitespace-pre-line rounded-xl bg-ink px-3 py-2 text-xs text-white shadow-lg"
      style={{ left: tip.x, top: tip.y - 8 }}
    >
      {tip.text}
    </div>
  );
}

export interface BarRow {
  label: string;
  values: number[];
  highlight?: string;
}

/** Barras horizontales (1 o 2 series). Con 2 series muestra leyenda; el valor va al final de cada barra. */
export function HBars({ rows, series, format = (n) => String(n), empty = "Sin datos en este período." }: {
  rows: BarRow[];
  series: { name: string; color: string }[];
  format?: (n: number) => string;
  empty?: string;
}) {
  const [tip, setTip] = useState<{ x: number; y: number; text: string } | null>(null);
  const max = Math.max(1, ...rows.flatMap((r) => r.values));
  if (!rows.length) return <p className="py-6 text-center text-sm text-ink-soft">{empty}</p>;
  return (
    <div className="relative" onMouseLeave={() => setTip(null)}>
      {series.length > 1 && (
        <div className="mb-3 flex flex-wrap gap-4 text-xs text-ink-2">
          {series.map((s) => (
            <span key={s.name} className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm" style={{ background: s.color }} />
              {s.name}
            </span>
          ))}
        </div>
      )}
      <ul className="space-y-3">
        {rows.map((r) => (
          <li
            key={r.label}
            className="grid grid-cols-[minmax(7rem,11rem)_1fr] items-center gap-3"
            onMouseMove={(e) => {
              const box = (e.currentTarget.parentElement!.parentElement as HTMLElement).getBoundingClientRect();
              setTip({ x: e.clientX - box.left, y: e.clientY - box.top, text: `${r.label}\n${series.map((s, i) => `${s.name}: ${format(r.values[i] ?? 0)}`).join("\n")}` });
            }}
          >
            <span className="truncate text-sm text-ink-2" title={r.label}>
              {r.label}
              {r.highlight && <span className="ml-1.5 rounded-full bg-m-yellow/25 px-1.5 py-0.5 text-[10px] font-semibold text-[#8a5a00]">{r.highlight}</span>}
            </span>
            <span className="flex flex-col gap-[2px]">
              {series.map((s, i) => (
                <span key={s.name} className="flex items-center gap-2">
                  <span
                    className="h-2.5 rounded-r-[4px]"
                    style={{ width: `${Math.max(1.5, ((r.values[i] ?? 0) / max) * 85)}%`, background: s.color }}
                  />
                  <span className="text-xs tabular-nums text-ink-2">{format(r.values[i] ?? 0)}</span>
                </span>
              ))}
            </span>
          </li>
        ))}
      </ul>
      <Tooltip tip={tip} />
    </div>
  );
}

/** Columnas verticales de una serie (por ejemplo, mensajes por hora o ventas por semana). */
export function VBars({ values, labels, format = (n) => String(n), tipLabel = (i) => labels[i], color = VIZ.s1, height = 160, tickEvery = 1 }: {
  values: number[];
  labels: string[];
  format?: (n: number) => string;
  tipLabel?: (i: number) => string;
  color?: string;
  height?: number;
  tickEvery?: number;
}) {
  const [tip, setTip] = useState<{ x: number; y: number; text: string } | null>(null);
  const max = Math.max(1, ...values);
  return (
    <div className="relative" onMouseLeave={() => setTip(null)}>
      <div className="flex items-end gap-[2px] border-b" style={{ height, borderColor: "#c3c2b7" }}>
        {values.map((v, i) => (
          <div
            key={i}
            className="group flex h-full flex-1 items-end"
            onMouseMove={(e) => {
              const box = (e.currentTarget.parentElement!.parentElement as HTMLElement).getBoundingClientRect();
              setTip({ x: e.clientX - box.left, y: e.clientY - box.top, text: `${tipLabel(i)}\n${format(v)}` });
            }}
          >
            <div className="w-full rounded-t-[4px] transition-opacity group-hover:opacity-80" style={{ height: `${(v / max) * 100}%`, minHeight: v > 0 ? 3 : 0, background: color }} />
          </div>
        ))}
      </div>
      <div className="mt-1 flex gap-[2px] text-[10px] tabular-nums text-[#898781]">
        {labels.map((l, i) => (
          <span key={i} className="flex-1 text-center">
            {i % tickEvery === 0 ? l : ""}
          </span>
        ))}
      </div>
      <Tooltip tip={tip} />
    </div>
  );
}

export function RangePicker({ value, onChange, options = [7, 30, 90] }: { value: number; onChange: (d: number) => void; options?: number[] }) {
  return (
    <div className="flex gap-1 rounded-full bg-white p-1 shadow-[var(--shadow-soft)]" role="group" aria-label="Período">
      {options.map((d) => (
        <button
          key={d}
          type="button"
          aria-pressed={value === d}
          onClick={() => onChange(d)}
          className="rounded-full px-3 py-1.5 text-sm font-medium text-ink-soft aria-pressed:bg-ink aria-pressed:text-white"
        >
          {d} días
        </button>
      ))}
    </div>
  );
}
