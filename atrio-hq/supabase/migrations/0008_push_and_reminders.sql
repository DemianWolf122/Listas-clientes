-- Notificaciones push: suscripciones por dispositivo + config VAPID + recordatorios.
-- (Los valores VAPID se cargaron por separado; acá queda el esquema.)

create table if not exists atrio_agenda.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references atrio_agenda.profiles(id) on delete cascade,
  endpoint text not null unique,
  subscription jsonb not null,
  created_at timestamptz default now()
);
alter table atrio_agenda.push_subscriptions enable row level security;
drop policy if exists push_subs_all on atrio_agenda.push_subscriptions;
create policy push_subs_all on atrio_agenda.push_subscriptions
  for all to anon, authenticated using (true) with check (true);
grant select, insert, update, delete on atrio_agenda.push_subscriptions to anon, authenticated;

-- Config VAPID (solo service role la lee: sin políticas ni grants a anon).
create table if not exists atrio_agenda.push_config (
  id int primary key default 1,
  vapid_public text not null,
  vapid_jwk jsonb not null,
  subject text not null default 'mailto:hq@atrio.studio'
);
alter table atrio_agenda.push_config enable row level security;

-- Marca de push enviado.
alter table atrio_agenda.notifications add column if not exists pushed_at timestamptz;

-- La Edge Function `push-dispatch` corre cada 5 min (pg_cron + pg_net):
--   crea recordatorios "due_soon" para bloques/entregas en <=12 min y
--   despacha por Web Push las notificaciones sin pushed_at.
