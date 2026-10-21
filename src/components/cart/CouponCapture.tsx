"use client";
import { useEffect } from "react";
import { captureCouponFromUrl } from "@/lib/coupon-link";

/** Guarda el cupón de cualquier enlace con ?cupon=… (por ejemplo el del correo de bienvenida). */
export function CouponCapture() {
  useEffect(() => {
    captureCouponFromUrl();
  }, []);
  return null;
}
