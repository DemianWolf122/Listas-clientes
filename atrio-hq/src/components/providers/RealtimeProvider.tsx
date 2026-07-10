"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabaseBrowser } from "@/lib/supabase/client";
import { INVALIDATION_MAP } from "@/lib/query-keys";
import { SCHEMA } from "@/lib/constants";

/**
 * Puente Realtime → TanStack Query. Se suscribe a postgres_changes de todas las
 * tablas relevantes de `atrio_agenda` y, ante cualquier cambio, invalida las
 * queries afectadas. Con 2 usuarios, invalidar por familia es lo más simple y
 * correcto. (Los datos de servidor nunca viven en Zustand.)
 */
export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const qc = useQueryClient();

  useEffect(() => {
    const supabase = supabaseBrowser();
    const channel = supabase.channel("atrio-db-changes");

    for (const table of Object.keys(INVALIDATION_MAP)) {
      channel.on(
        "postgres_changes",
        { event: "*", schema: SCHEMA, table },
        () => {
          for (const key of INVALIDATION_MAP[table]) {
            qc.invalidateQueries({ queryKey: key });
          }
        }
      );
    }

    channel.subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);

  return <>{children}</>;
}
