-- search_path fijo (evita advisor de función con search_path mutable).
alter function atrio_agenda.set_updated_at() set search_path = '';
