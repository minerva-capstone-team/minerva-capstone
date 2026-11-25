"use client";
import { useEffect, useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { cn } from "@/lib/format";

const translate = (msg: string) => {
  if (/invalid login/i.test(msg)) return "Usuario, email o contraseña incorrectos.";
  if (/already registered/i.test(msg)) return "Ya existe una cuenta con ese email. Inicia sesión.";
  if (/password should be at least/i.test(msg)) return "La contraseña debe tener al menos 6 caracteres.";
  if (/email not confirmed/i.test(msg)) return "Confirma tu email desde el correo que te enviamos.";
  if (/rate limit|security purposes/i.test(msg)) return "Ya enviamos un correo hace poco. Espera unos minutos antes de pedir otro.";
  return "No pudimos completar la acción. Intenta nuevamente.";
};

/** Permite entrar con un nombre de usuario: "guti" equivale a guti@minerva-arteycolor.cl. */
const loginEmail = (value: string) => {
  const v = value.trim();
  return v.includes("@") ? v : `${v.toLowerCase()}@minerva-arteycolor.cl`;
};

export function AuthForm({ allowSignUp = true, title, startInReset = false }: { allowSignUp?: boolean; title?: string; startInReset?: boolean }) {
  const [mode, setMode] = useState<"login" | "signup" | "reset">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  // /cuenta?modo=crear abre directo la pestaña "Crear cuenta"
  useEffect(() => {
    if (allowSignUp && new URLSearchParams(window.location.search).get("modo") === "crear") setMode("signup");
    if (startInReset) setMode("reset");
  }, [allowSignUp, startInReset]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const sb = getBrowserSupabase();
    if (!sb) return;
    setLoading(true);
    setError(null);
    setInfo(null);
    if (mode === "signup" && (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password))) {
      setLoading(false);
      setError("Usa una contraseña de al menos 8 caracteres, con letras y números.");
      return;
    }
    if (mode === "reset") {
      const { error: resetError } = await sb.auth.resetPasswordForEmail(loginEmail(email), { redirectTo: `${window.location.origin}/cuenta?modo=nueva` });
      setLoading(false);
      if (resetError) setError(translate(resetError.message));
      else setInfo("Si ese correo está registrado, te enviamos un enlace para crear una contraseña nueva. Revisa también la carpeta de spam.");
      return;
    }
    const { data, error } =
      mode === "login"
        ? await sb.auth.signInWithPassword({ email: loginEmail(email), password })
        : await sb.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: `${window.location.origin}/cuenta` } });
    setLoading(false);
    if (error) setError(translate(error.message));
    else if (mode === "signup" && !data.session) setInfo("¡Listo! Revisa tu correo para confirmar tu cuenta.");
  };

  return (
    <form onSubmit={submit} className="mx-auto w-full max-w-md rounded-[2rem] bg-white p-6 shadow-[var(--shadow-soft)] sm:p-8">
      {title && <h2 className="display text-2xl">{title}</h2>}
      {allowSignUp && mode !== "reset" && (
        <div className="mb-6 grid grid-cols-2 rounded-full bg-paper-2 p-1" role="tablist" aria-label="Tipo de acceso">
          {(["login", "signup"] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              onClick={() => {
                setMode(m);
                setError(null);
                setInfo(null);
              }}
              className={cn("h-10 rounded-full text-sm font-semibold transition-colors", mode === m ? "bg-white shadow-sm" : "text-ink-soft")}
            >
              {m === "login" ? "Ingresar" : "Crear cuenta"}
            </button>
          ))}
        </div>
      )}
      <div className={cn("space-y-4", title && "mt-6")}>
        <div>
          <label htmlFor="auth-email" className="label">
            {mode === "signup" ? "Email" : "Email o usuario"}
          </label>
          <input id="auth-email" type={mode === "signup" ? "email" : "text"} required autoComplete={mode === "login" ? "username" : "email"} autoCapitalize="none" className="field" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        {mode === "reset" ? (
          <p className="text-sm text-ink-soft">Escribe el correo con el que te registraste y te enviaremos un enlace para crear una contraseña nueva.</p>
        ) : (
        <div>
          <label htmlFor="auth-pass" className="label">
            Contraseña
          </label>
          <input
            id="auth-pass"
            type="password"
            required
            minLength={mode === "signup" ? 8 : 6}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            className="field"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {mode === "login" && (
            <button
              type="button"
              className="mt-2 text-sm font-medium text-ink-2 underline underline-offset-4 hover:text-ink"
              onClick={() => {
                setMode("reset");
                setError(null);
                setInfo(null);
              }}
            >
              ¿Olvidaste tu contraseña?
            </button>
          )}
        </div>
        )}
        {error && (
          <p role="alert" className="rounded-xl bg-m-red/10 p-3 text-sm text-m-red">
            {error}
          </p>
        )}
        {info && (
          <p role="status" className="rounded-xl bg-m-green/10 p-3 text-sm text-[#1c6b51]">
            {info}
          </p>
        )}
        <button type="submit" disabled={loading} className="btn btn-primary w-full">
          {loading ? "Un momento…" : mode === "login" ? "Ingresar" : mode === "reset" ? "Enviar enlace" : "Crear cuenta"}
        </button>
        {mode === "reset" && (
          <button
            type="button"
            className="w-full text-sm font-medium text-ink-2 underline underline-offset-4 hover:text-ink"
            onClick={() => {
              setMode("login");
              setError(null);
              setInfo(null);
            }}
          >
            Volver a ingresar
          </button>
        )}
      </div>
    </form>
  );
}
