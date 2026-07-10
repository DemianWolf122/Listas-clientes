-- Exponer atrio_agenda en PostgREST (mismo mecanismo que el dashboard:
-- Project Settings → API → Exposed schemas). Es un superconjunto del default de
-- Supabase (public, graphql_public), así que NO le saca acceso a wepairr.
--
-- Alternativa 100% equivalente: agregar `atrio_agenda` en el dashboard.
alter role authenticator set pgrst.db_schemas = 'public, graphql_public, atrio_agenda';
notify pgrst, 'reload config';
notify pgrst, 'reload schema';
