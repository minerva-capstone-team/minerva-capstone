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
/** Calidad según los píxeles que aporta la foto al área impresa (después del encuadre). */
export function assessSize(width: number, height: number): ImageQuality {
  const longSide = Math.max(width, height);
  const shortSide = Math.min(width, height);
  const size = `${width} × ${height} px`;
  if (longSide >= GOOD_PX && shortSide >= OK_PX) return { width, height, level: "good", message: `Buena resolución (${size}): se verá nítida.` };
  if (longSide >= OK_PX && shortSide >= 500)
    return { width, height, level: "ok", message: `Resolución justa (${size}). Se puede estampar, pero de cerca podría verse un poco suave. Si acercaste mucho la foto, prueba con menos zoom.` };
  return { width, height, level: "low", message: `Resolución baja (${size}): es probable que se vea pixelada al imprimir. Usa la foto original (no una captura ni una reenviada por redes) o acerca menos.` };
}

export async function assessImage(file: Blob): Promise<ImageQuality> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
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
