"use client";

import { supabaseBrowser } from "@/lib/supabase/client";

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

  const reg = await navigator.serviceWorker.register("/sw.js");
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
