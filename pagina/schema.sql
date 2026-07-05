-- Atrio Lead Hunter · esquema de la campaña electrónica (proyecto Supabase Wepairr)
-- Aplicado el 2026-07-05. Tablas aisladas, no tocan la app.

create extension if not exists "pgcrypto";

create table if not exists public.atrio_leads_electro (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sub_rubro text, tier smallint, segmento text,
  address text, city text, province text, zona_barrio text,
  phone text, whatsapp text, wa_link text, email text,
  instagram text, facebook text, website text,
  website_status text, is_own_site boolean, has_agency boolean,
  descripcion text, manejado_por text,
  lifecycle text, reviews_count integer, rating numeric(2,1), last_review_approx text,
  senales jsonb default '[]'::jsonb,
  fit_score integer, momentum_score integer, final_score integer,
  verdict text, verdict_confidence numeric(3,2), verdict_reason text,
  producto_sugerido text, gancho text, mensaje_whatsapp text,
  confianza_global text, fuentes jsonb default '[]'::jsonb,
  contactado boolean not null default false, contactado_at timestamptz, notas text,
  dedup_key text generated always as (lower(regexp_replace(coalesce(name,''),'\s+',' ','g')) || '|' || lower(coalesce(city,''))) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists atrio_leads_electro_dedup_uidx on public.atrio_leads_electro (dedup_key);
create index if not exists atrio_leads_electro_zona_idx on public.atrio_leads_electro (zona_barrio);
create index if not exists atrio_leads_electro_verdict_idx on public.atrio_leads_electro (verdict);
create index if not exists atrio_leads_electro_final_idx on public.atrio_leads_electro (final_score desc);
create index if not exists atrio_leads_electro_contactado_idx on public.atrio_leads_electro (contactado);

create or replace function public.atrio_leads_electro_set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;
drop trigger if exists trg_atrio_leads_updated on public.atrio_leads_electro;
create trigger trg_atrio_leads_updated before update on public.atrio_leads_electro
  for each row execute function public.atrio_leads_electro_set_updated_at();

-- RLS: lectura publica; update solo de gestion (contactado/notas)
alter table public.atrio_leads_electro enable row level security;
drop policy if exists atrio_leads_public_read on public.atrio_leads_electro;
create policy atrio_leads_public_read on public.atrio_leads_electro for select to anon, authenticated using (true);
drop policy if exists atrio_leads_public_update_mgmt on public.atrio_leads_electro;
create policy atrio_leads_public_update_mgmt on public.atrio_leads_electro for update to anon, authenticated using (true) with check (true);
revoke update on public.atrio_leads_electro from anon;
grant update (contactado, contactado_at, notas) on public.atrio_leads_electro to anon;
grant update (contactado, contactado_at, notas) on public.atrio_leads_electro to authenticated;

-- Estado de cobertura (coordina los ciclos del autoloop)
create table if not exists public.atrio_leads_coverage (
  id serial primary key,
  zona text not null, query_family text not null,
  status text not null default 'pending',
  leads_found integer default 0, notas text,
  updated_at timestamptz not null default now(),
  unique(zona, query_family)
);
alter table public.atrio_leads_coverage enable row level security;
drop policy if exists cov_read on public.atrio_leads_coverage;
create policy cov_read on public.atrio_leads_coverage for select to anon, authenticated using (true);
