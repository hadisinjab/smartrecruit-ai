-- Drop deprecated table: public.activity_logs
-- We migrated admin audit logging to public.active_log.

do $$
begin
  -- Drop policies first (names from older schema versions)
  begin
    drop policy if exists "Admins can view logs." on public.activity_logs;
  exception when undefined_object then
    null;
  end;

  begin
    drop policy if exists "System can insert logs." on public.activity_logs;
  exception when undefined_object then
    null;
  end;

  -- Then drop the table
  drop table if exists public.activity_logs;
end $$;






