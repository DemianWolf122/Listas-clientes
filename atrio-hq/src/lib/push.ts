"use client";

import { supabaseBrowser } from "@/lib/supabase/client";
import { playNotify } from "@/lib/sound";

// Clave pública VAPID (es pública por diseño; la privada vive solo en Supabase).
export const VAPID_PUBLIC_KEY =
  "BN8pA5CJAcndVX15YY0JUe9kN43y5pYegxsgAW8KUbLBlubqtvAhCtzBcEDlqBOd4-T3dXUUmSY2pJQu9grl2pc";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

export function pushSupported() {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export type PushState = "unsupported" | "denied" | "on" | "off";

export async function getPushState(): Promise<PushState> {
  if (!pushSupported()) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    return sub ? "on" : "off";
  } catch {
    return "off";
  }
}

/** Pide permiso, se suscribe y guarda la suscripción en Supabase. */
export async function enablePush(profileId: string): Promise<PushState> {
  if (!pushSupported()) return "unsupported";
  const perm = await Notification.requestPermission();
  if (perm !== "granted") return perm === "denied" ? "denied" : "off";

  const reg = await navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" });
  await reg.update().catch(() => {});
  await navigator.serviceWorker.ready;

  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
  }
  await supabaseBrowser()
    .from("push_subscriptions")
    .upsert(
      { profile_id: profileId, endpoint: sub.endpoint, subscription: JSON.parse(JSON.stringify(sub)) },
      { onConflict: "endpoint" }
    );
  return "on";
}

/** Muestra una notificación local (sin servidor): prueba SW + permiso + display. */
export async function showLocalTest(): Promise<boolean> {
  try {
    if (!pushSupported() || Notification.permission !== "granted") return false;
    const reg = await navigator.serviceWorker.ready;
    await reg.showNotification("🔔 Prueba de Atrio", {
      body: "Si ves esto (y lo escuchás), las notificaciones andan 🎉",
      icon: "/icon",
      badge: "/badge",
      silent: false,
      vibrate: [180, 90, 180],
    } as NotificationOptions);
    playNotify();
    return true;
  } catch {
    return false;
  }
}

/** Dispara un push real desde el servidor a tus dispositivos (prueba end-to-end). */
export async function sendServerTest(profileId: string): Promise<boolean> {
  try {
    const { error } = await supabaseBrowser().functions.invoke("push-dispatch", {
      body: { ping: profileId },
    });
    return !error;
  } catch {
    return false;
  }
}

/** Escucha el "echo" que manda el service worker cuando llega un push. */
export function onPushEcho(
  cb: (info: { at: number; title?: string; body?: string; url?: string; recipient?: string }) => void
): () => void {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return () => {};
  const handler = (e: MessageEvent) => {
    if (e.data && e.data.type === "atrio-push") {
      cb({ at: e.data.at, title: e.data.title, body: e.data.body, url: e.data.url, recipient: e.data.recipient });
    }
  };
  navigator.serviceWorker.addEventListener("message", handler);
  return () => navigator.serviceWorker.removeEventListener("message", handler);
}

export type Diagnostics = {
  supported: boolean;
  permission: NotificationPermission | "unsupported";
  swRegistered: boolean;
  swVersion: string | null;
  subscribed: boolean;
  endpointHost: string | null;
};

async function swVersion(reg?: ServiceWorkerRegistration | null): Promise<string | null> {
  const target = reg?.active || navigator.serviceWorker.controller;
  if (!target) return null;
  return new Promise((resolve) => {
    const ch = new MessageChannel();
    const timer = setTimeout(() => resolve(null), 1200);
    ch.port1.onmessage = (e) => {
      clearTimeout(timer);
      resolve(e.data?.version ?? null);
    };
    try {
      target.postMessage({ type: "atrio-getver" }, [ch.port2]);
    } catch {
      clearTimeout(timer);
      resolve(null);
    }
  });
}

/** Estado real de las notificaciones en este dispositivo (para diagnóstico). */
export async function getDiagnostics(): Promise<Diagnostics> {
  if (!pushSupported()) {
    return {
      supported: false,
      permission: "unsupported",
      swRegistered: false,
      swVersion: null,
      subscribed: false,
      endpointHost: null,
    };
  }
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  let host: string | null = null;
  if (sub) {
    try {
      host = new URL(sub.endpoint).host;
    } catch {
      /* noop */
    }
  }
  return {
    supported: true,
    permission: Notification.permission,
    swRegistered: !!reg,
    swVersion: await swVersion(reg),
    subscribed: !!sub,
    endpointHost: host,
  };
}

export async function disablePush(): Promise<void> {
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    if (sub) {
      await supabaseBrowser().from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
      await sub.unsubscribe();
    }
  } catch {
    /* noop */
  }
}
