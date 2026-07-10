-- HQ de Atrio :: schema aislado (coexiste con wepairr sin tocar `public`)
create schema if not exists atrio_agenda;

grant usage on schema atrio_agenda to anon, authenticated, service_role;
grant all on all tables in schema atrio_agenda to anon, authenticated, service_role;
grant all on all routines in schema atrio_agenda to anon, authenticated, service_role;
grant all on all sequences in schema atrio_agenda to anon, authenticated, service_role;

alter default privileges for role postgres in schema atrio_agenda
  grant all on tables to anon, authenticated, service_role;
alter default privileges for role postgres in schema atrio_agenda
  grant all on routines to anon, authenticated, service_role;
alter default privileges for role postgres in schema atrio_agenda
  grant all on sequences to anon, authenticated, service_role;
