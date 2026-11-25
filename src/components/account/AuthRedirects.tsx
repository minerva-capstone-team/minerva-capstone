"use client";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getBrowserSupabase } from "@/lib/supabase/client";

/**
 * Enlaces de Supabase Auth (recuperar contraseña) que llegan a cualquier página:
 * - Enlace válido → /cuenta?modo=nueva (pide la contraseña nueva).
 * - Enlace vencido o ya usado → /cuenta?modo=vencido (explica y deja pedir otro).
 */
export function AuthRedirects() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const query = new URLSearchParams(window.location.search);
    const errorCode = hash.get("error_code") ?? query.get("error_code");
    if (errorCode || hash.get("error") === "access_denied") {
      router.replace("/cuenta?modo=vencido");
      return;
    }
    const isRecovery = hash.get("type") === "recovery" || query.get("type") === "recovery";
    const sb = getBrowserSupabase(); // procesa el token del enlace (si viene en la URL)
    if (!sb) return;
    if (isRecovery && pathname !== "/cuenta") {
      // Espera a que Supabase guarde la sesión del enlace antes de cambiar de página.
      void sb.auth.getSession().then(() => router.replace("/cuenta?modo=nueva"));
    }
    const { data } = sb.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" && window.location.pathname !== "/cuenta") router.replace("/cuenta?modo=nueva");
    });
    return () => data.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
