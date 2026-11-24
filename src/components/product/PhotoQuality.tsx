import { cn } from "@/lib/format";
import type { ImageQuality } from "@/lib/image-quality";

const TONE = {
  good: "bg-m-green/12 text-[#1c6b51]",
  ok: "bg-m-yellow/20 text-[#8a5a00]",
  low: "bg-m-red/10 text-[#b42318]",
} as const;
const ICON = { good: "✓", ok: "!", low: "✕" } as const;

export function PhotoQuality({ quality }: { quality: ImageQuality }) {
  return (
    <p role="status" className={cn("mt-2 flex items-start gap-2 rounded-xl p-3 text-sm", TONE[quality.level])}>
      <span aria-hidden className="mt-px font-bold">
        {ICON[quality.level]}
      </span>
      <span>
        {quality.message}
        {quality.level !== "good" && (
          <span className="mt-1 block text-xs opacity-80">Es solo un aviso: puedes continuar igual. Antes de imprimir revisamos tu imagen y te enviamos el diseño para aprobar.</span>
        )}
      </span>
    </p>
  );
}
