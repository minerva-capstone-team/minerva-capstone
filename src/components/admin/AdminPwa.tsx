"use client";
import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";

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
