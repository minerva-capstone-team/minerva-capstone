"use client";

/**
 * Cupón que llega por enlace (?cupon=CODIGO desde Instagram o un correo): se guarda unos días en
 * el navegador y el checkout lo aplica solo. No contiene datos personales, solo el código.
 */
const KEY = "minerva-coupon";
const DAYS = 7;
const CODE = /^[A-Z0-9_-]{3,30}$/;

export function saveCoupon(raw: string | null | undefined) {
  const code = (raw ?? "").trim().toUpperCase();
  if (!CODE.test(code)) return null;
  try {
    localStorage.setItem(KEY, JSON.stringify({ code, until: Date.now() + DAYS * 86_400_000 }));
  } catch {
    /* sin almacenamiento: el cupón igual se puede escribir a mano */
  }
  return code;
}

export function readCoupon(): string | null {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "null") as { code?: string; until?: number } | null;
    if (v?.code && CODE.test(v.code) && (v.until ?? 0) > Date.now()) return v.code;
  } catch {
    /* ignorar */
  }
  return null;
}

export function clearCoupon() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignorar */
  }
}

/** Lee ?cupon= de la dirección actual y lo guarda. */
export function captureCouponFromUrl() {
  return saveCoupon(new URLSearchParams(window.location.search).get("cupon"));
}
