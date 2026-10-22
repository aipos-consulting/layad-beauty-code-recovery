-- Read-only capacity metrics; callable only by the server service role.
create or replace function public.admin_capacity_usage()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'dbBytes', pg_catalog.pg_database_size(pg_catalog.current_database()),
    'storageBytes', coalesce((select sum((metadata->>'size')::bigint) from storage.objects), 0),
    'measuredAt', now()
  );
$$;
revoke all on function public.admin_capacity_usage() from public, anon, authenticated;
grant execute on function public.admin_capacity_usage() to service_role;
