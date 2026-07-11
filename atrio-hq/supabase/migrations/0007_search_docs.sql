-- Búsqueda dentro del contenido de los docs (título + bloques BlockNote).
-- La usa el ⌘K vía RPC: supabase.rpc('search_docs', { q }).
create or replace function atrio_agenda.search_docs(q text)
returns table(id uuid, title text, icon text)
language sql stable
set search_path = atrio_agenda
as $$
  select d.id, d.title, d.icon
  from atrio_agenda.docs d
  where d.title ilike '%' || q || '%'
     or d.content::text ilike '%' || q || '%'
  order by d.updated_at desc
  limit 6
$$;

grant execute on function atrio_agenda.search_docs(text) to anon, authenticated;
