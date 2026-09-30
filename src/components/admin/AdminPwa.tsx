"use client";
import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { toast } from "@/lib/stores";

type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

let deferred: InstallPromptEvent | null = null;
const listeners = new Set<() => void>();

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as InstallPromptEvent;
    listeners.forEach((l) => l());
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    listeners.forEach((l) => l());
  });
}

export function useRegisterAdminSw() {
  useEffect(() => {
    if (!("serviceWorker" in navigator) || process.env.NODE_ENV !== "production") return;
    navigator.serviceWorker.register("/admin-sw.js", { scope: "/admin" }).catch(() => {});
  }, []);
}

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function urlBase64ToUint8Array(b64: string) {
  const padded = (b64 + "=".repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

type PushState = "checking" | "unsupported" | "needs-install" | "off" | "on" | "denied" | "busy";

/** Activa/desactiva los avisos de pedidos nuevos en ESTE dispositivo. */
export function PushToggle({ className }: { className?: string }) {
  const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
  const [state, setState] = useState<PushState>("checking");

  const saveSubscription = async (sub: PushSubscription) => {
    const sb = getBrowserSupabase();
    const { data } = (await sb?.auth.getUser()) ?? { data: { user: null } };
    const json = sub.toJSON();
    if (!sb || !data.user || !json.keys) return false;
    const { error } = await sb
      .from("push_subscriptions")
      .upsert({ user_id: data.user.id, endpoint: sub.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth }, { onConflict: "endpoint" });
    return !error;
  };

  useEffect(() => {
    if (!vapid || process.env.NODE_ENV !== "production") return setState("unsupported");
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      return setState(isIos() && !isStandalone() ? "needs-install" : "unsupported");
    }
    if (Notification.permission === "denied") return setState("denied");
    let alive = true;
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then(async (sub) => {
        if (!alive) return;
        if (sub) await saveSubscription(sub);
        setState(sub ? "on" : "off");
      })
      .catch(() => alive && setState("unsupported"));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vapid]);

  if (state === "checking" || state === "unsupported") return null;
  if (state === "needs-install") return <p className="mx-3 rounded-xl bg-paper p-3 text-xs text-ink-2">Instala la app en tu pantalla de inicio para activar los avisos de pedidos.</p>;
  if (state === "denied") return <p className="mx-3 rounded-xl bg-paper p-3 text-xs text-ink-2">Bloqueaste las notificaciones. Actívalas desde los ajustes del navegador o de la app.</p>;

  const toggle = async () => {
    const prev = state;
    setState("busy");
    try {
      const reg = await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();
      if (prev === "on" && existing) {
        await getBrowserSupabase()?.from("push_subscriptions").delete().eq("endpoint", existing.endpoint);
        await existing.unsubscribe();
        toast({ title: "Avisos desactivados en este dispositivo" });
        return setState("off");
      }
      if ((await Notification.requestPermission()) !== "granted") return setState("denied");
      const sub = existing ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(vapid) }));
      if (!(await saveSubscription(sub))) throw new Error("save failed");
      toast({ title: "Avisos activados", description: "Te avisaremos cuando llegue un pedido nuevo." });
      setState("on");
    } catch {
      toast({ title: "No se pudieron activar los avisos", description: "Revisa que la migración 0005 esté aplicada en Supabase e inténtalo de nuevo.", tone: "error" });
      setState(prev);
    }
  };

  return (
    <button type="button" onClick={toggle} disabled={state === "busy"} className={className}>
      <Icon name="sparkle" size={18} /> {state === "on" ? "Avisos de pedidos: activados" : "Activar avisos de pedidos"}
    </button>
  );
}

export function InstallAppButton({ className }: { className?: string }) {
  const [, force] = useState(0);
  const [ready, setReady] = useState(false);
  const [showIosHelp, setShowIosHelp] = useState(false);

  useEffect(() => {
    const l = () => force((n) => n + 1);
    listeners.add(l);
    setReady(true);
    return () => void listeners.delete(l);
  }, []);

  if (!ready || isStandalone()) return null;
  const ios = isIos();
  if (!deferred && !ios) return null;

  const onClick = async () => {
    if (deferred) {
      await deferred.prompt();
      await deferred.userChoice;
      deferred = null;
      force((n) => n + 1);
    } else {
      setShowIosHelp((v) => !v);
    }
  };

  return (
    <div>
      <button type="button" onClick={onClick} className={className}>
        <Icon name="upload" size={18} className="rotate-180" /> Instalar app
      </button>
      {showIosHelp && (
        <p className="mx-3 mt-1 rounded-xl bg-paper p-3 text-xs text-ink-2">
          En Safari toca <strong>Compartir</strong> y luego <strong>Agregar a pantalla de inicio</strong>.
        </p>
      )}
    </div>
  );
}
