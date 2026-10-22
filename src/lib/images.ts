"use client";

/** Reduce una imagen en el navegador para guardarla en el carrito sin pesar demasiado. */
export async function downscaleImage(file: File, maxSize = 900, quality = 0.85): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("El archivo debe ser una imagen.");
  if (file.size > 10 * 1024 * 1024) throw new Error("La imagen supera los 10 MB.");
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const keepAlpha = file.type === "image/png" || file.type === "image/webp";
  return canvas.toDataURL(keepAlpha ? "image/webp" : "image/jpeg", quality);
}

/** Límite del bucket de imágenes de clientes (5 MB) con margen. */
const MAX_UPLOAD_BYTES = 4.8 * 1024 * 1024;

async function encode(bitmap: ImageBitmap, maxSize: number, type: string, quality: number): Promise<Blob> {
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("No pudimos procesar la imagen."))), type, quality));
}

/**
 * Versión para imprimir: hasta 2400 px por lado (un estampado de taza necesita ~2000 px)
 * y menos de 5 MB. Mantiene la transparencia si la imagen la tiene.
 */
export async function prepareForPrint(blob: Blob, maxSize = 2400): Promise<Blob> {
  if (!blob.type.startsWith("image/")) throw new Error("El archivo debe ser una imagen.");
  if (blob.size > 15 * 1024 * 1024) throw new Error("La imagen supera los 15 MB.");
  const bitmap = await createImageBitmap(blob);
  try {
    const alpha = blob.type === "image/png" || blob.type === "image/webp";
    let out = await encode(bitmap, maxSize, alpha ? "image/webp" : "image/jpeg", 0.92);
    for (const q of [0.85, 0.75]) if (out.size > MAX_UPLOAD_BYTES) out = await encode(bitmap, maxSize, alpha ? "image/webp" : "image/jpeg", q);
    if (out.size > MAX_UPLOAD_BYTES) out = await encode(bitmap, 1800, alpha ? "image/webp" : "image/jpeg", 0.8);
    return out;
  } finally {
    bitmap.close();
  }
}

/** Vista previa liviana (data URL) para el carro y la maqueta del producto. */
export async function previewDataUrl(blob: Blob, maxSize = 900): Promise<string> {
  const bitmap = await createImageBitmap(blob);
  try {
    const alpha = blob.type === "image/png" || blob.type === "image/webp";
    const small = await encode(bitmap, maxSize, alpha ? "image/webp" : "image/jpeg", 0.85);
    return await new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = () => reject(r.error);
      r.readAsDataURL(small);
    });
  } finally {
    bitmap.close();
  }
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const [meta, b64] = dataUrl.split(",");
  const mime = /data:(.*?);/.exec(meta)?.[1] ?? "image/jpeg";
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}
