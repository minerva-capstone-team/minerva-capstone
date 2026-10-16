import "server-only";
import { createClient } from "@supabase/supabase-js";
import { supabaseUrl } from "./config";

/**
 * Cliente con la clave de servicio: ignora RLS, así que SOLO se usa en el servidor y para
 * escrituras internas acotadas (por ejemplo, registrar preguntas de los asistentes).
 * Si SUPABASE_SERVICE_ROLE_KEY no está configurada, esas funciones simplemente se desactivan.
 */
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export const isServiceConfigured = Boolean(supabaseUrl && serviceKey);

export function getServiceSupabase() {
  if (!isServiceConfigured) return null;
  return createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
}
