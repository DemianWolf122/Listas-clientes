# push-dispatch

Edge Function desplegada en Supabase (proyecto Wepairr). Corre cada 5 min vía
pg_cron + pg_net y:

1. Crea notificaciones `due_soon` para bloques que arrancan / entregas que
   vencen en <=12 min (hora de Buenos Aires).
2. Despacha por Web Push (VAPID) las notificaciones sin `pushed_at` a las
   suscripciones del destinatario, y limpia las suscripciones muertas (410/404).

El código vive en Supabase (deploy vía MCP). Las claves VAPID están en la tabla
`atrio_agenda.push_config` (privada). La pública también está en `src/lib/push.ts`.
