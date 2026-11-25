"use client";
import type { PreviewKind } from "./types";

/** Encuadre que elige el cliente: acercar (zoom), mover (x, y entre -1 y 1) y girar. */
export interface Crop {
  zoom: number;
  x: number;
  y: number;
  rotate: 0 | 90 | 180 | 270;
}

export const NO_CROP: Crop = { zoom: 1, x: 0, y: 0, rotate: 0 };
export const isDefaultCrop = (c: Crop) => c.zoom === 1 && c.x === 0 && c.y === 0 && c.rotate === 0;

/** Proporción (ancho / alto) del área donde se imprime en cada tipo de producto. */
export const PRINT_ASPECT: Record<PreviewKind, number> = {
  mug: 0.93,
  notebook: 0.73,
  tote: 0.84,
  generic: 1,
  round: 1,
  rect: 1.36,
  bottle: 0.78,
  shirt: 0.82,
  pillow: 1,
  bag: 0.86,
  clock: 1,
};

async function rotated(blob: Blob, rotate: Crop["rotate"]): Promise<CanvasImageSource & { width: number; height: number }> {
  const bmp = await createImageBitmap(blob, { imageOrientation: "from-image" });
  if (!rotate) return bmp;
  const c = document.createElement("canvas");
  const swap = rotate === 90 || rotate === 270;
  c.width = swap ? bmp.height : bmp.width;
  c.height = swap ? bmp.width : bmp.height;
  const ctx = c.getContext("2d")!;
  ctx.translate(c.width / 2, c.height / 2);
  ctx.rotate((rotate * Math.PI) / 180);
  ctx.drawImage(bmp, -bmp.width / 2, -bmp.height / 2);
  bmp.close();
  return c;
}

/** Zona de la foto que queda dentro del área de impresión (en píxeles de la foto). */
export function cropRegion(srcW: number, srcH: number, aspect: number, crop: Crop) {
  let w = srcW;
  let h = srcW / aspect;
  if (h > srcH) {
    h = srcH;
    w = srcH * aspect;
  }
  w /= crop.zoom;
  h /= crop.zoom;
  const cx = srcW / 2 + crop.x * ((srcW - w) / 2);
  const cy = srcH / 2 + crop.y * ((srcH - h) / 2);
  return { left: cx - w / 2, top: cy - h / 2, width: w, height: h };
}

/**
 * Recorta la foto con el encuadre elegido y la proporción del producto.
 * Con maxSide pequeño sirve de vista previa; con 2400 es la versión que se imprime.
 */
export async function renderCrop(blob: Blob, aspect: number, crop: Crop, maxSide = 2400): Promise<{ blob: Blob; width: number; height: number }> {
  const src = await rotated(blob, crop.rotate);
  const r = cropRegion(src.width, src.height, aspect, crop);
  const s = Math.min(1, maxSide / Math.max(r.width, r.height));
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(r.width * s));
  c.height = Math.max(1, Math.round(r.height * s));
  const ctx = c.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(src, r.left, r.top, r.width, r.height, 0, 0, c.width, c.height);
  if ("close" in src && typeof src.close === "function") src.close();
  const alpha = blob.type === "image/png" || blob.type === "image/webp";
  const out = await new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("No pudimos encuadrar la foto."))), alpha ? "image/webp" : "image/jpeg", 0.92));
  // Resolución real que aporta la foto al área impresa (para el aviso de calidad).
  return { blob: out, width: Math.round(r.width), height: Math.round(r.height) };
}

/**
 * «Mejorar luz y color»: estira los niveles (sombras y luces) y sube un poco la saturación.
 * Es instantáneo, corre en el navegador y funciona bien con fotos opacas u oscuras.
 */
export async function autoEnhance(blob: Blob): Promise<Blob> {
  const bmp = await createImageBitmap(blob, { imageOrientation: "from-image" });
  const c = document.createElement("canvas");
  c.width = bmp.width;
  c.height = bmp.height;
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(bmp, 0, 0);
  bmp.close();
  const img = ctx.getImageData(0, 0, c.width, c.height);
  const d = img.data;
  const hist = new Uint32Array(256);
  let n = 0;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 16) continue; // ignora lo transparente (fondo quitado)
    hist[Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2])]++;
    n++;
  }
  let lo = 0;
  let hi = 255;
  for (let acc = 0; lo < 255 && (acc += hist[lo]) < n * 0.01; ) lo++;
  for (let acc = 0; hi > 0 && (acc += hist[hi]) < n * 0.01; ) hi--;
  if (hi - lo < 40) {
    lo = Math.max(0, lo - 20);
    hi = Math.min(255, hi + 20);
  }
  const scale = 255 / Math.max(1, hi - lo);
  const sat = 1.12;
  for (let i = 0; i < d.length; i += 4) {
    let r = (d[i] - lo) * scale;
    let g = (d[i + 1] - lo) * scale;
    let b = (d[i + 2] - lo) * scale;
    const l = 0.299 * r + 0.587 * g + 0.114 * b;
    r = l + (r - l) * sat;
    g = l + (g - l) * sat;
    b = l + (b - l) * sat;
    d[i] = r < 0 ? 0 : r > 255 ? 255 : r;
    d[i + 1] = g < 0 ? 0 : g > 255 ? 255 : g;
    d[i + 2] = b < 0 ? 0 : b > 255 ? 255 : b;
  }
  ctx.putImageData(img, 0, 0);
  const alpha = blob.type === "image/png" || blob.type === "image/webp";
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("No pudimos mejorar la foto."))), alpha ? "image/webp" : "image/jpeg", 0.92));
}
