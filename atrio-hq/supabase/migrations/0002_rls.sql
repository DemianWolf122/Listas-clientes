-- RLS en TODAS las tablas de atrio_agenda. Dos usuarios de confianza, todo
-- compartido → policies permisivas para anon+authenticated (defensa en profundidad).
do $$
declare t record;
begin
  for t in select tablename from pg_tables where schemaname = 'atrio_agenda'
  loop
    execute format('alter table atrio_agenda.%I enable row level security;', t.tablename);
    execute format('drop policy if exists atrio_all on atrio_agenda.%I;', t.tablename);
    execute format(
      'create policy atrio_all on atrio_agenda.%I for all to anon, authenticated using (true) with check (true);',
      t.tablename);
  end loop;
end $$;
