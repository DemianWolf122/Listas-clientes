-- Rutina :: bloques de calendario personales, agrupados en 5 sub-calendarios
-- (áreas): trabajo profundo, reuniones, administrativo, salud y social.
--
-- Cada bloque pertenece a UNA persona (la rutina es distinta para cada uno) y
-- vive en el día `date`. `repeat_rule` permite que un bloque se repita sin
-- duplicar filas: la expansión a días concretos se hace en el cliente.
-- Todo aditivo: no toca ninguna tabla existente.

create table if not exists atrio_agenda.routine_blocks (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references atrio_agenda.profiles(id) on delete cascade,
  area text not null default 'deep'
    check (area in ('deep', 'meetings', 'admin', 'health', 'social')),
  -- sigla del proyecto/tema, se muestra como "DW | ESC — Portada brochure"
  code text,
  title text not null,
  notes text,
  date date not null,
  start_time time not null,
  end_time time not null,
  done boolean not null default false,
  -- vínculo opcional con una tarea del HQ (el bloque es "cuándo la hago")
  task_id uuid references atrio_agenda.tasks(id) on delete set null,
  repeat_rule text not null default 'none'
    check (repeat_rule in ('none', 'daily', 'weekdays', 'weekly')),
  repeat_until date,
  created_by uuid references atrio_agenda.profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint routine_blocks_horario check (end_time > start_time)
);

create index if not exists idx_routine_profile_date on atrio_agenda.routine_blocks(profile_id, date);
create index if not exists idx_routine_date on atrio_agenda.routine_blocks(date);
create index if not exists idx_routine_task on atrio_agenda.routine_blocks(task_id);

drop trigger if exists trg_routine_updated on atrio_agenda.routine_blocks;
create trigger trg_routine_updated before update on atrio_agenda.routine_blocks
  for each row execute function atrio_agenda.set_updated_at();

-- RLS: mismo criterio que el resto del schema (dos usuarios de confianza).
alter table atrio_agenda.routine_blocks enable row level security;
drop policy if exists atrio_all on atrio_agenda.routine_blocks;
create policy atrio_all on atrio_agenda.routine_blocks
  for all to anon, authenticated using (true) with check (true);

grant all on atrio_agenda.routine_blocks to anon, authenticated, service_role;

-- Realtime (idempotente).
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'atrio_agenda'
      and tablename = 'routine_blocks'
  ) then
    alter publication supabase_realtime add table atrio_agenda.routine_blocks;
  end if;
end $$;

notify pgrst, 'reload schema';
