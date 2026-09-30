"use client";
import { useEffect, useState } from "react";
import { getBrowserSupabase } from "./supabase/client";
import type { CheckoutQuote } from "./types";

/** Vista previa de cupón + envío + total. El servidor lo recalcula de nuevo al crear el pedido. */
export async function quoteCheckout(subtotal: number, region: string, coupon: string): Promise<CheckoutQuote | null> {
  const sb = getBrowserSupabase();
  if (!sb) return null;
  const { data, error } = await sb.rpc("quote_checkout", {
    p_subtotal: subtotal,
    p_region: region,
    p_coupon: coupon.trim() || null,
  });
  if (error || !data) return null;
  return data as CheckoutQuote;
}

/** Monto desde el cual el envío es gratis (null = no hay promoción). */
export function useFreeShippingMin() {
  const [min, setMin] = useState<number | null>(null);
  useEffect(() => {
    const sb = getBrowserSupabase();
    if (!sb) return;
    let alive = true;
    sb.from("store_settings")
      .select("free_shipping_min")
      .maybeSingle()
      .then(({ data }) => alive && setMin((data?.free_shipping_min as number | null | undefined) ?? null));
    return () => {
      alive = false;
    };
  }, []);
  return min;
}

/** Deja solo dígitos y K, y formatea como 12.345.678-5. */
export function formatRut(raw: string) {
  const clean = raw.replace(/[^0-9kK]/g, "").toUpperCase().slice(0, 9);
  if (clean.length < 2) return clean;
  const body = clean.slice(0, -1).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${body}-${clean.slice(-1)}`;
}

/** Dígito verificador (módulo 11), igual que rut_valid() en la base de datos. */
export function isValidRut(raw: string) {
  const clean = raw.replace(/[^0-9kK]/g, "").toUpperCase();
  if (clean.length < 2) return false;
  const body = clean.slice(0, -1);
  if (!/^\d+$/.test(body)) return false;
  let acc = 0;
  let mul = 2;
  for (let i = body.length - 1; i >= 0; i--) {
    acc += Number(body[i]) * mul;
    mul = mul === 7 ? 2 : mul + 1;
  }
  const rest = 11 - (acc % 11);
  const expected = rest === 11 ? "0" : rest === 10 ? "K" : String(rest);
  return clean.slice(-1) === expected;
}
