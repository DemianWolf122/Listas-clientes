"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { supabaseBrowser } from "@/lib/supabase/client";
import { SCHEMA } from "@/lib/constants";
import { useIdentity } from "@/stores/identity";
import { playNotify, unlockAudio } from "@/lib/sound";
import { onPushEcho } from "@/lib/push";

/**
 * Aviso in-app con la app abierta: cuando llega un push (echo del service worker)
 * o se inserta una notificación para el perfil activo (realtime), suena un ding
 * y aparece un cartel. Es 100% nuestro, así que funciona aunque el SO (Windows,
 * etc.) tape la notificación nativa o la muestre sin sonido.
 */
export function NotificationSound() {
  const me = useIdentity((s) => s.profileId);
  const router = useRouter();
  const lastFire = useRef(0);

  // Suena + cartel (tocable para ir al aviso exacto), con anti-duplicado (el push
  // y el realtime pueden llegar casi juntos para el mismo aviso).
  function fire(title?: string, body?: string, url?: string) {
    const now = Date.now();
    if (now - lastFire.current < 2500) return;
    lastFire.current = now;
    playNotify();
    toast(title || "🔔 Atrio", {
      description: body || undefined,
      duration: 6000,
      action: url ? { label: "Ver", onClick: () => router.push(url) } : undefined,
    });
  }

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

  // Echo del service worker: se dispara apenas llega el push al dispositivo.
  useEffect(() => {
    return onPushEcho((info) => fire(info.title, info.body, info.url));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Realtime: cubre el caso sin push (app abierta, aviso recién creado).
  useEffect(() => {
    if (!me) return;
    const supabase = supabaseBrowser();
    const channel = supabase
      .channel("atrio-notif-sound")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: SCHEMA, table: "notifications", filter: `recipient_id=eq.${me}` },
        (payload) => {
          const n = payload.new as { title?: string; body?: string; target_type?: string; target_id?: string };
          const url =
            n?.target_type === "channel"
              ? `/chat/${n.target_id}`
              : n?.target_type === "task"
                ? "/mis-tareas"
                : undefined;
          fire(n?.title, n?.body, url);
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me]);

  return null;
}
