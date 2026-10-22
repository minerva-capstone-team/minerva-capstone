"use client";
import { useState } from "react";
import { cn } from "@/lib/format";
import { toast } from "@/lib/stores";
import { removeBackground, upscale2x, UPSCALE_MAX_SIDE } from "@/lib/image-ai";
import type { ImageQuality } from "@/lib/image-quality";
import { Icon } from "@/components/ui/Icon";

export type PhotoFix = "nitidez" | "fondo";

/**
 * Herramientas gratuitas de IA para la foto de personalización: mejorar nitidez y quitar fondo.
 * Todo corre en el navegador; el resultado reemplaza la foto que se imprime (con opción de volver atrás).
 */
export function PhotoTools({
  current,
  quality,
  applied,
  onResult,
  onRevert,
}: {
  current: Blob;
  quality: ImageQuality | null;
  applied: PhotoFix[];
  onResult: (blob: Blob, fix: PhotoFix) => Promise<void>;
  onRevert: () => void;
}) {
  const [busy, setBusy] = useState<PhotoFix | null>(null);
  const [progress, setProgress] = useState<number | null>(null);

  const canUpscale = !applied.includes("nitidez") && quality !== null && quality.level !== "good" && Math.max(quality.width, quality.height) <= UPSCALE_MAX_SIDE;
  const canRemoveBg = !applied.includes("fondo");

  const run = async (fix: PhotoFix) => {
    setBusy(fix);
    setProgress(null);
    try {
      const out = fix === "nitidez" ? await upscale2x(current, setProgress) : await removeBackground(current, setProgress);
      await onResult(out, fix);
      toast({ title: fix === "nitidez" ? "Nitidez mejorada" : "Fondo quitado", description: "Revisa la vista previa. Puedes volver a la original cuando quieras." });
    } catch (e) {
      toast({
        title: "No pudimos mejorar la foto",
        description: e instanceof Error && e.message.length < 120 ? e.message : "Prueba de nuevo o con otra foto. También puedes enviárnosla tal cual: igual revisamos el diseño contigo.",
        tone: "error",
      });
    } finally {
      setBusy(null);
      setProgress(null);
    }
  };

  if (!canUpscale && !canRemoveBg && !applied.length) return null;

  return (
    <div className="mt-3 rounded-2xl border border-line p-3">
      <p className="flex items-center gap-2 text-sm font-semibold">
        <Icon name="sparkle" size={16} className="text-m-magenta" /> Mejora tu foto con IA
        <span className="font-normal text-ink-soft">· gratis</span>
      </p>
      <p className="mt-1 text-xs text-ink-soft">Se procesa en tu dispositivo: tu foto no se envía a ningún lado hasta que compras.</p>

      {busy ? (
        <div className="mt-3 flex items-center gap-3 rounded-xl bg-paper-2 p-3 text-sm" role="status" aria-live="polite">
          <span className="size-5 shrink-0 animate-spin rounded-full border-2 border-line border-t-ink" />
          <span>
            {progress !== null && progress < 100 ? `Preparando la herramienta… ${progress}% (solo la primera vez)` : busy === "nitidez" ? "Mejorando la nitidez… puede tardar hasta un minuto." : "Quitando el fondo…"}
          </span>
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          {canUpscale && (
            <button type="button" className="btn btn-primary h-10 px-4 text-sm" onClick={() => void run("nitidez")}>
              Mejorar nitidez
            </button>
          )}
          {canRemoveBg && (
            <button type="button" className={cn("btn h-10 px-4 text-sm", canUpscale ? "btn-ghost" : "btn-primary")} onClick={() => void run("fondo")}>
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
              ✓ {f === "nitidez" ? "Nitidez mejorada" : "Fondo quitado"}
            </span>
          ))}
        </p>
      )}
      {canRemoveBg && <p className="mt-2 text-xs text-ink-soft">Quitar fondo funciona mejor con personas, mascotas u objetos bien definidos.</p>}
    </div>
  );
}
