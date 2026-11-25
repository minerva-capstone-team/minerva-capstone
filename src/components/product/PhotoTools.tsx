"use client";
import { useState } from "react";
import { toast } from "@/lib/stores";
import { autoEnhance } from "@/lib/crop";
import { removeBackground } from "@/lib/image-ai";
import { Icon } from "@/components/ui/Icon";

export type PhotoFix = "color" | "fondo" | "nitidez";

/**
 * Mejoras de la foto antes de imprimir:
 *  - «Mejorar luz y color»: instantáneo, corrige fotos opacas u oscuras.
 *  - «Quitar fondo»: IA en el navegador, para personas, mascotas u objetos bien definidos.
 * El resultado reemplaza la foto que se imprime (con opción de volver a la original).
 */
export function PhotoTools({
  current,
  applied,
  onResult,
  onRevert,
}: {
  current: Blob;
  applied: PhotoFix[];
  onResult: (blob: Blob, fix: PhotoFix) => Promise<void>;
  onRevert: () => void;
}) {
  const [busy, setBusy] = useState<PhotoFix | null>(null);
  const [progress, setProgress] = useState<number | null>(null);

  const run = async (fix: PhotoFix) => {
    setBusy(fix);
    setProgress(null);
    try {
      const out = fix === "color" ? await autoEnhance(current) : await removeBackground(current, setProgress);
      await onResult(out, fix);
      toast({ title: fix === "color" ? "Luz y color mejorados" : "Fondo quitado", description: "Revisa cómo quedó. Puedes volver a la original cuando quieras." });
    } catch (e) {
      toast({
        title: "No pudimos mejorar la foto",
        description: e instanceof Error && e.message.length < 120 ? e.message : "Prueba de nuevo o con otra foto. También puedes enviarla tal cual: igual revisamos el diseño contigo.",
        tone: "error",
      });
    } finally {
      setBusy(null);
      setProgress(null);
    }
  };

  return (
    <div className="mt-3 rounded-2xl border border-line p-3">
      <p className="flex items-center gap-2 text-sm font-semibold">
        <Icon name="sparkle" size={16} className="text-m-magenta" /> Mejora tu foto
        <span className="font-normal text-ink-soft">· gratis</span>
      </p>
      {busy ? (
        <div className="mt-3 flex items-center gap-3 rounded-xl bg-paper-2 p-3 text-sm" role="status" aria-live="polite">
          <span className="size-5 shrink-0 animate-spin rounded-full border-2 border-line border-t-ink" />
          <span>
            {busy === "color" ? "Mejorando luz y color…" : progress !== null && progress < 100 ? `Preparando la herramienta… ${progress}% (solo la primera vez)` : "Quitando el fondo… puede tardar unos segundos."}
          </span>
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          {!applied.includes("color") && (
            <button type="button" className="btn btn-primary h-10 px-4 text-sm" onClick={() => void run("color")}>
              Mejorar luz y color
            </button>
          )}
          {!applied.includes("fondo") && (
            <button type="button" className="btn btn-ghost h-10 px-4 text-sm" onClick={() => void run("fondo")}>
              Quitar fondo
            </button>
          )}
          {applied.length > 0 && (
            <button type="button" className="btn btn-ghost h-10 px-4 text-sm" onClick={onRevert}>
              Volver a la original
            </button>
          )}
        </div>
      )}
      {applied.length > 0 && (
        <p className="mt-3 flex flex-wrap gap-1.5 text-xs">
          {applied.map((f) => (
            <span key={f} className="rounded-full bg-m-green/12 px-2.5 py-1 font-medium text-[#1c6b51]">
              ✓ {f === "color" ? "Luz y color mejorados" : f === "fondo" ? "Fondo quitado" : "Nitidez mejorada"}
            </span>
          ))}
        </p>
      )}
      <p className="mt-2 text-xs text-ink-soft">«Quitar fondo» funciona mejor con personas, mascotas u objetos bien definidos. Tu foto no sale de tu dispositivo hasta que compras.</p>
    </div>
  );
}
