"use client";

import { supabaseBrowser } from "@/lib/supabase/client";
import type { Database } from "@/lib/types/database";

type ActivityInsert = Database["atrio_agenda"]["Tables"]["activity"]["Insert"];
type NotificationInsert = Database["atrio_agenda"]["Tables"]["notifications"]["Insert"];

/** Registra una entrada en el feed de actividad (best-effort, no rompe la UX). */
export async function logActivity(entry: ActivityInsert) {
  try {
    await supabaseBrowser().from("activity").insert(entry);
  } catch {
    /* noop */
  }
}

/** Crea una notificación para el destinatario (inbox unificada). */
export async function notify(entry: NotificationInsert) {
  try {
    await supabaseBrowser().from("notifications").insert(entry);
  } catch {
    /* noop */
  }
}
