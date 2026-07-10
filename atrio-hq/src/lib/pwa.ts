"use client";

/** Estado de instalación PWA (beforeinstallprompt + detección iOS/standalone). */
type Listener = () => void;

let deferred: any = null;
const listeners = new Set<Listener>();
let inited = false;

function emit() {
  listeners.forEach((l) => l());
}

export function initPWA() {
  if (inited || typeof window === "undefined") return;
  inited = true;
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e;
    emit();
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    emit();
  });
}

export function subscribePWA(l: Listener) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

export function canPromptInstall() {
  return !!deferred;
}

export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false;
  deferred.prompt();
  const choice = await deferred.userChoice;
  if (choice?.outcome === "accepted") deferred = null;
  emit();
  return choice?.outcome === "accepted";
}

export function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true
  );
}

export function isIOS() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return (
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && (navigator as any).maxTouchPoints > 1)
  );
}
