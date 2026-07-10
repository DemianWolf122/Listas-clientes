"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useIdentity } from "@/stores/identity";
import { useProfiles } from "@/hooks/profiles";
import type { PresenceState } from "@/lib/constants";

export interface PresenceMeta {
  profileId: string;
  name: string;
  emoji: string | null;
  color: string;
  state: PresenceState;
  customStatus: string | null;
  viewing: string | null;
  online_at: string;
}

interface PresenceContextValue {
  everyone: Record<string, PresenceMeta>;
  selfState: PresenceState;
  customStatus: string | null;
  setSelfState: (s: PresenceState) => void;
  setCustomStatus: (s: string | null) => void;
  setViewing: (label: string | null) => void;
  typingByChannel: Record<string, string[]>;
  sendTyping: (channelId: string) => void;
}

const PresenceContext = createContext<PresenceContextValue | null>(null);

export function PresenceProvider({ children }: { children: React.ReactNode }) {
  const profileId = useIdentity((s) => s.profileId);
  const { data: profiles } = useProfiles();
  const me = useMemo(
    () => profiles?.find((p) => p.id === profileId) ?? null,
    [profiles, profileId]
  );

  const channelRef = useRef<RealtimeChannel | null>(null);
  const subscribedRef = useRef(false);
  const metaRef = useRef<PresenceMeta | null>(null);

  const [everyone, setEveryone] = useState<Record<string, PresenceMeta>>({});
  const [selfState, setSelfStateS] = useState<PresenceState>("online");
  const [customStatus, setCustomStatusS] = useState<string | null>(null);
  const [typingByChannel, setTypingByChannel] = useState<Record<string, string[]>>({});
  const typingTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const retrack = useCallback(() => {
    const ch = channelRef.current;
    if (ch && subscribedRef.current && metaRef.current) {
      ch.track(metaRef.current);
    }
  }, []);

  const setSelfState = useCallback(
    (s: PresenceState) => {
      setSelfStateS(s);
      if (metaRef.current) metaRef.current = { ...metaRef.current, state: s };
      retrack();
    },
    [retrack]
  );

  const setCustomStatus = useCallback(
    (s: string | null) => {
      setCustomStatusS(s);
      if (metaRef.current) metaRef.current = { ...metaRef.current, customStatus: s };
      retrack();
    },
    [retrack]
  );

  const setViewing = useCallback(
    (label: string | null) => {
      if (metaRef.current && metaRef.current.viewing !== label) {
        metaRef.current = { ...metaRef.current, viewing: label };
        retrack();
      }
    },
    [retrack]
  );

  const sendTyping = useCallback((channelId: string) => {
    const ch = channelRef.current;
    if (ch && subscribedRef.current && metaRef.current) {
      ch.send({
        type: "broadcast",
        event: "typing",
        payload: { channelId, profileId: metaRef.current.profileId },
      });
    }
  }, []);

  // conexión de presencia
  useEffect(() => {
    if (!profileId || !me) return;
    const supabase = supabaseBrowser();
    const channel = supabase.channel("atrio-room", {
      config: { presence: { key: profileId } },
    });
    channelRef.current = channel;
    metaRef.current = {
      profileId,
      name: me.name,
      emoji: me.emoji,
      color: me.accent_color,
      state: selfState,
      customStatus,
      viewing: metaRef.current?.viewing ?? null,
      online_at: new Date().toISOString(),
    };

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<PresenceMeta>();
        const flat: Record<string, PresenceMeta> = {};
        Object.values(state).forEach((arr) => {
          const m = arr[0] as unknown as PresenceMeta;
          if (m?.profileId) flat[m.profileId] = m;
        });
        setEveryone(flat);
      })
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        const { channelId, profileId: who } = payload as {
          channelId: string;
          profileId: string;
        };
        if (who === profileId) return;
        setTypingByChannel((prev) => {
          const list = new Set(prev[channelId] ?? []);
          list.add(who);
          return { ...prev, [channelId]: [...list] };
        });
        const timerKey = `${channelId}:${who}`;
        clearTimeout(typingTimers.current[timerKey]);
        typingTimers.current[timerKey] = setTimeout(() => {
          setTypingByChannel((prev) => ({
            ...prev,
            [channelId]: (prev[channelId] ?? []).filter((id) => id !== who),
          }));
        }, 3500);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          subscribedRef.current = true;
          if (metaRef.current) await channel.track(metaRef.current);
        }
      });

    return () => {
      subscribedRef.current = false;
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId, me?.id]);

  // detección simple de "ausente" tras 5 min de inactividad
  useEffect(() => {
    if (!profileId) return;
    let idleTimer: ReturnType<typeof setTimeout>;
    const arm = () => {
      clearTimeout(idleTimer);
      if (metaRef.current?.state === "idle") setSelfState("online");
      idleTimer = setTimeout(() => {
        if (metaRef.current?.state === "online") setSelfState("idle");
      }, 5 * 60_000);
    };
    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    events.forEach((e) => window.addEventListener(e, arm, { passive: true }));
    arm();
    return () => {
      clearTimeout(idleTimer);
      events.forEach((e) => window.removeEventListener(e, arm));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId]);

  const value: PresenceContextValue = {
    everyone,
    selfState,
    customStatus,
    setSelfState,
    setCustomStatus,
    setViewing,
    typingByChannel,
    sendTyping,
  };

  return <PresenceContext.Provider value={value}>{children}</PresenceContext.Provider>;
}

export function usePresence() {
  const ctx = useContext(PresenceContext);
  if (!ctx) {
    // fallback inerte (por si se usa fuera del provider, p. ej. en el selector)
    return {
      everyone: {},
      selfState: "offline" as PresenceState,
      customStatus: null,
      setSelfState: () => {},
      setCustomStatus: () => {},
      setViewing: () => {},
      typingByChannel: {},
      sendTyping: () => {},
    } satisfies PresenceContextValue;
  }
  return ctx;
}

/** Anuncia "qué estoy mirando" (now playing) mientras el componente esté montado. */
export function useAnnounceViewing(label: string | null) {
  const { setViewing } = usePresence();
  useEffect(() => {
    setViewing(label);
    return () => setViewing(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [label]);
}
