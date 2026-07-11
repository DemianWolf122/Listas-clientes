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
