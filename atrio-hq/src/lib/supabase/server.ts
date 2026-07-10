import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/types/database";
import { SCHEMA } from "@/lib/constants";

/**
 * Cliente de servidor (Server Components / Route Handlers / Server Actions).
 * Usa cookies para la sesión; apuntado al schema `atrio_agenda`.
 */
export async function supabaseServer() {
  const cookieStore = await cookies();
  return createServerClient<Database, typeof SCHEMA>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      db: { schema: SCHEMA },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component — safe to ignore, middleware refreshes.
          }
        },
      },
    }
  );
}
