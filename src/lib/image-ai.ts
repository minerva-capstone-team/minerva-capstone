"use client";

/**
 * Mejoras de foto con IA que corren en el navegador del cliente (gratis, sin servidor ni API de pago):
 *  - Nitidez: Swin2SR x2 (Apache-2.0, ~8 MB) amplía la foto al doble.
 *  - Fondo: ORMBG (Apache-2.0, ~44 MB) recorta a la persona u objeto principal.
 * Los modelos se descargan una sola vez desde Hugging Face al tocar el botón y quedan en la caché
 * del navegador. La foto nunca sale del dispositivo.
 */

// Se carga desde el CDN solo cuando se usa: no pesa en la página ni pasa por el bundler.
const TRANSFORMERS_URL = "https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.2.0/+esm";
const UPSCALE_MODEL = "Xenova/swin2SR-lightweight-x2-64";
const BG_MODEL = "onnx-community/ormbg-ONNX";
/** Fotos más grandes ya tienen buena resolución y ampliarlas sería muy lento en un celular. */
export const UPSCALE_MAX_SIDE = 1400;

type Pipe = (input: unknown) => Promise<unknown>;
interface RawImageLike {
  width: number;
  height: number;
  toCanvas(): HTMLCanvasElement | OffscreenCanvas;
}
interface TransformersModule {
  pipeline: (task: string, model: string, opts?: Record<string, unknown>) => Promise<Pipe>;
  RawImage: { fromBlob(b: Blob): Promise<RawImageLike> };
  env: { allowLocalModels: boolean };
}

let lib: Promise<TransformersModule> | null = null;
const pipes = new Map<string, Promise<Pipe>>();

function load(): Promise<TransformersModule> {
  lib ??= (import(/* webpackIgnore: true */ /* turbopackIgnore: true */ TRANSFORMERS_URL) as Promise<TransformersModule>).then((m) => {
    m.env.allowLocalModels = false;
    return m;
  });
  return lib;
}

const device = () => (typeof navigator !== "undefined" && "gpu" in navigator ? "webgpu" : "wasm");

function getPipe(task: string, model: string, dtype: string, onProgress?: (pct: number) => void): Promise<Pipe> {
  const key = `${task}:${model}`;
  if (!pipes.has(key)) {
    const p = load().then(async (m) => {
      const opts = {
        dtype,
        progress_callback: (e: { status?: string; progress?: number }) => {
          if (e.status === "progress" && typeof e.progress === "number") onProgress?.(Math.round(e.progress));
        },
      };
      try {
        return await m.pipeline(task, model, { ...opts, device: device() });
      } catch {
        // WebGPU no disponible o inestable en este equipo: se usa la CPU.
        return m.pipeline(task, model, { ...opts, device: "wasm" });
      }
    });
    p.catch(() => pipes.delete(key));
    pipes.set(key, p);
  }
  return pipes.get(key)!;
}

async function toBlob(img: RawImageLike, type: "image/png" | "image/webp" = "image/png"): Promise<Blob> {
  const canvas = img.toCanvas();
  if ("convertToBlob" in canvas) return (canvas as OffscreenCanvas).convertToBlob({ type, quality: 0.95 });
  return new Promise((resolve, reject) => (canvas as HTMLCanvasElement).toBlob((b) => (b ? resolve(b) : reject(new Error("No se pudo generar la imagen."))), type, 0.95));
}

/** Amplía la foto al doble con más detalle que un simple estirado. */
export async function upscale2x(blob: Blob, onProgress?: (pct: number) => void): Promise<Blob> {
  const m = await load();
  const pipe = await getPipe("image-to-image", UPSCALE_MODEL, "fp32", onProgress);
  const input = await m.RawImage.fromBlob(blob);
  if (Math.max(input.width, input.height) > UPSCALE_MAX_SIDE) throw new Error("La foto ya tiene buena resolución.");
  const out = (await pipe(input)) as RawImageLike | RawImageLike[];
  return toBlob(Array.isArray(out) ? out[0] : out);
}

/** Quita el fondo y deja el resto transparente (PNG). */
export async function removeBackground(blob: Blob, onProgress?: (pct: number) => void): Promise<Blob> {
  const m = await load();
  const pipe = await getPipe("background-removal", BG_MODEL, "uint8", onProgress);
  const input = await m.RawImage.fromBlob(blob);
  const out = (await pipe(input)) as RawImageLike | RawImageLike[];
  return toBlob(Array.isArray(out) ? out[0] : out);
}
