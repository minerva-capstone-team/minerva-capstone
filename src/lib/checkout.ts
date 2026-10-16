"use client";
import { useEffect, useState } from "react";
import { getBrowserSupabase } from "./supabase/client";
import type { CheckoutQuote } from "./types";

/** Vista previa de cupón + envío + total. El servidor lo recalcula de nuevo al crear el pedido. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Líneas del carro para cupones por producto (precio × cantidad de cada ítem). */
export const quoteLines = (items: { productId: string; unitPrice: number; quantity: number }[]) =>
  items.map((i) => ({ product_id: UUID.test(i.productId) ? i.productId : "", amount: i.unitPrice * i.quantity }));

export async function quoteCheckout(
  subtotal: number,
  region: string,
  coupon: string,
  lines?: ReturnType<typeof quoteLines>,
  email?: string,
): Promise<CheckoutQuote | null> {
  const sb = getBrowserSupabase();
  if (!sb) return null;
  const { data, error } = await sb.rpc("quote_checkout", {
    p_subtotal: subtotal,
    p_region: region,
    p_coupon: coupon.trim() || null,
    p_lines: lines ?? null,
    p_email: email?.trim() || null,
  });
  if (error || !data) return null;
  return data as CheckoutQuote;
}

export interface MyCoupon {
  code: string;
  kind: "percent" | "fixed";
  value: number;
  min_subtotal: number;
  expires_at: string | null;
  product_id: string | null;
  product_name: string | null;
  product_slug: string | null;
}

/** Cupones personales vigentes de la clienta con sesión iniciada (vacío si no hay sesión o falta 0007). */
export async function myCoupons(): Promise<MyCoupon[]> {
  const sb = getBrowserSupabase();
  if (!sb) return [];
  const { data: s } = await sb.auth.getSession();
  if (!s.session) return [];
  const { data, error } = await sb.rpc("my_coupons");
  return error || !Array.isArray(data) ? [] : (data as MyCoupon[]);
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
