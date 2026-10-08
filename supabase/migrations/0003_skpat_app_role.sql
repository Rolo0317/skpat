-- Solo Supabase. Rol dedicado de la aplicación, dueño del esquema `skpat` (por eso no lo frena RLS).
-- La contraseña NO vive en el repo: se creó como verificador SCRAM generado localmente.
--   create role skpat_app login noinherit password '<SCRAM-SHA-256 verifier>';
grant skpat_app to postgres;
alter role skpat_app set search_path = skpat, extensions;
revoke all on schema skpat from public, anon, authenticated;
alter schema skpat owner to skpat_app;
do $$
declare t record;
begin
  for t in select tablename from pg_tables where schemaname = 'skpat' loop
    execute format('alter table skpat.%I owner to skpat_app', t.tablename);
  end loop;
end $$;
revoke all on schema public from skpat_app;
