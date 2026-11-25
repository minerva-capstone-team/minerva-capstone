"use client";
import { useRef } from "react";
import { NO_CROP, isDefaultCrop, type Crop } from "@/lib/crop";

/**
 * Encuadre de la foto: el cliente la acerca, la arrastra para elegir qué parte queda en el
 * producto y la puede girar. Muestra exactamente el recorte que se va a imprimir.
 */
export function PhotoFraming({
  framed,
  aspect,
  round,
  crop,
  onChange,
}: {
  framed: string | null;
  aspect: number;
  round: boolean;
  crop: Crop;
  onChange: (c: Crop) => void;
}) {
  const drag = useRef<{ x: number; y: number; crop: Crop } | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const clamp = (v: number) => Math.max(-1, Math.min(1, v));

  const onPointerDown = (e: React.PointerEvent) => {
    drag.current = { x: e.clientX, y: e.clientY, crop };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    const el = box.current;
    if (!d || !el) return;
    const k = 2.2 / Math.max(1, crop.zoom);
    onChange({
      ...d.crop,
      x: clamp(d.crop.x - ((e.clientX - d.x) / el.clientWidth) * k),
      y: clamp(d.crop.y - ((e.clientY - d.y) / el.clientHeight) * k),
    });
  };
  const end = () => (drag.current = null);

  return (
    <div className="mt-3 rounded-2xl border border-line p-3">
      <p className="text-sm font-semibold">Ajusta tu foto</p>
      <p className="mt-0.5 text-xs text-ink-soft">Así quedará en el producto. Arrastra la foto para moverla y usa la barra para acercar.</p>
      <div className="mt-3 flex flex-wrap items-start gap-4">
        <div
          ref={box}
          className={`relative w-40 shrink-0 cursor-grab touch-none overflow-hidden bg-paper-2 ring-1 ring-line active:cursor-grabbing ${round ? "rounded-full" : "rounded-xl"}`}
          style={{ aspectRatio: String(aspect) }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={end}
          onPointerCancel={end}
          role="img"
          aria-label="Vista del encuadre de tu foto"
        >
          {framed ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={framed} alt="" draggable={false} className="pointer-events-none size-full select-none object-cover" />
          ) : (
            <span className="skeleton block size-full" />
          )}
        </div>
        <div className="min-w-44 flex-1 space-y-3">
          <label className="block text-xs font-medium text-ink-2">
            Acercar
            <input
              type="range"
              min={1}
              max={3}
              step={0.05}
              value={crop.zoom}
              onChange={(e) => onChange({ ...crop, zoom: Number(e.target.value) })}
              className="mt-1 w-full accent-[var(--color-ink)]"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn btn-ghost h-9 px-3 text-xs" onClick={() => onChange({ ...crop, rotate: (((crop.rotate + 90) % 360) as Crop["rotate"]) })}>
              ↻ Girar
            </button>
            <button type="button" className="btn btn-ghost h-9 px-3 text-xs" disabled={isDefaultCrop(crop)} onClick={() => onChange(NO_CROP)}>
              Centrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
