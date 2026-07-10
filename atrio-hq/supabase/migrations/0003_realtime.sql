-- Alta de tablas al publication de realtime (aditivo, idempotente).
do $$
declare
  tbls text[] := array[
    'messages','reactions','tasks','sections','projects','channels',
    'comments','events','notifications','channel_reads','activity','task_tags','tags'
  ];
  tb text;
begin
  foreach tb in array tbls loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'atrio_agenda' and tablename = tb
    ) then
      execute format('alter publication supabase_realtime add table atrio_agenda.%I;', tb);
    end if;
  end loop;
end $$;

alter table atrio_agenda.reactions replica identity full;
