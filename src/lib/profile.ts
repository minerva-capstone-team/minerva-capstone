"use client";
import { getBrowserSupabase } from "./supabase/client";

export interface Profile {
  first_name: string;
  last_name: string;
  phone: string;
  address: string;
  comuna: string;
  region: string;
  delivery: "envio" | "retiro" | null;
}

export const EMPTY_PROFILE: Profile = { first_name: "", last_name: "", phone: "", address: "", comuna: "", region: "", delivery: null };

/** Datos guardados del usuario con sesión iniciada (null si no hay sesión o aún no guarda nada). */
export async function loadProfile(): Promise<Profile | null> {
  const sb = getBrowserSupabase();
  if (!sb) return null;
  const { data: s } = await sb.auth.getSession();
  if (!s.session) return null;
  const { data, error } = await sb.from("profiles").select("*").eq("user_id", s.session.user.id).maybeSingle();
  if (error || !data) return null;
  const clean = (v: unknown) => (typeof v === "string" ? v : "");
  return {
    first_name: clean(data.first_name),
    last_name: clean(data.last_name),
    phone: clean(data.phone),
    address: clean(data.address),
    comuna: clean(data.comuna),
    region: clean(data.region),
    delivery: data.delivery === "retiro" || data.delivery === "envio" ? data.delivery : null,
  };
}

export async function saveProfile(p: Partial<Profile>): Promise<{ ok: boolean; error?: string }> {
  const sb = getBrowserSupabase();
  if (!sb) return { ok: false, error: "no configurado" };
  const { data: s } = await sb.auth.getSession();
  if (!s.session) return { ok: false, error: "sin sesión" };
  const trimmed = Object.fromEntries(Object.entries(p).map(([k, v]) => [k, typeof v === "string" ? v.trim().slice(0, 200) : v]));
  const { error } = await sb.from("profiles").upsert({ user_id: s.session.user.id, ...trimmed, updated_at: new Date().toISOString() });
  return error ? { ok: false, error: error.message } : { ok: true };
}
