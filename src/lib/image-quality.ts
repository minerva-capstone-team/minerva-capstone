"use client";

export type QualityLevel = "good" | "ok" | "low";

export interface ImageQuality {
  width: number;
  height: number;
  level: QualityLevel;
  message: string;
}

/** Lado mayor recomendado para que un estampado se vea nítido (referencia para tazas y similares). */
const GOOD_PX = 1500;
const OK_PX = 800;

/**
 * Revisa la foto ORIGINAL (antes de reducirla para el carrito) y avisa si se verá pixelada.
 * Mide solo la resolución: no detecta fotos movidas o desenfocadas.
 */
export async function assessImage(file: File): Promise<ImageQuality> {
  const bitmap = await createImageBitmap(file);
  const { width, height } = bitmap;
  bitmap.close();
  const longSide = Math.max(width, height);
  const shortSide = Math.min(width, height);
  const size = `${width} × ${height} px`;

  if (longSide >= GOOD_PX && shortSide >= OK_PX) {
    return { width, height, level: "good", message: `Buena resolución (${size}): se verá nítida.` };
  }
  if (longSide >= OK_PX && shortSide >= 500) {
    return { width, height, level: "ok", message: `Resolución justa (${size}). Se puede estampar, pero de cerca podría verse un poco suave. Si tienes una versión más grande, mejor.` };
  }
  return { width, height, level: "low", message: `Resolución baja (${size}): es probable que se vea pixelada al imprimir. Prueba con la foto original, sin captura de pantalla ni reenviada por redes.` };
}
