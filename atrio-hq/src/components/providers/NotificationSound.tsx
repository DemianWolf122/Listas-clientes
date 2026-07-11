"use client";

import { useEffect } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { SCHEMA } from "@/lib/constants";
import { useIdentity } from "@/stores/identity";
import { playNotify, unlockAudio } from "@/lib/sound";

/**
 * Sonido de notificaciones con la app abierta: cuando llega una notificación
 * nueva para el perfil activo (postgres_changes INSERT), suena un ding. El push
 * del sistema cubre el caso con la app cerrada. Se reproduce "sí o sí" (no
 * depende del toggle de sonidos sutiles, que es para los mensajes).
 */
export function NotificationSound() {
  const me = useIdentity((s) => s.profileId);

  // Desbloquea el audio en el primer gesto (requisito de iOS/Safari).
  useEffect(() => {
    const unlock = () => unlockAudio();
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  useEffect(() => {
    if (!me) return;
    const supabase = supabaseBrowser();
    const channel = supabase
      .channel("atrio-notif-sound")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: SCHEMA, table: "notifications", filter: `recipient_id=eq.${me}` },
        () => playNotify()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [me]);

  return null;
}
