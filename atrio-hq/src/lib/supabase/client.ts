"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/types/database";
import { SCHEMA } from "@/lib/constants";

/**
 * Cliente de navegador apuntado al schema aislado `atrio_agenda`.
 * IMPORTANTE: para que las queries REST funcionen, `atrio_agenda` tiene que
 * estar en Project Settings → API → Exposed schemas (ver README).
 */
let browserClient: ReturnType<typeof create> | undefined;

function create() {
  return createBrowserClient<Database, typeof SCHEMA>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { db: { schema: SCHEMA } }
  );
}

/** Singleton para no abrir múltiples conexiones realtime en el browser. */
export function supabaseBrowser() {
  if (!browserClient) browserClient = create();
  return browserClient;
}
