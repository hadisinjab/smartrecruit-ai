-- Assignments improvements: constraints, indexes, and RLS policies
-- Roles in this project: 'super-admin' | 'admin' | 'reviewer'

-- 1) Type constraint
alter table public.assignments
  drop constraint if exists assignments_type_check;

alter table public.assignments
  add constraint assignments_type_check
  check (type in ('text_only', 'text_and_links'));

-- 2) Helpful indexes
create index if not exists idx_assignments_application_id on public.assignments (application_id);
create index if not exists idx_assignments_created_at on public.assignments (created_at desc);

-- 3) RLS policies
alter table public.assignments enable row level security;

-- Read policy (org-scoped):
-- - Super Admin sees all
-- - Admin/Reviewer see assignments only for applications in their organization
drop policy if exists "Staff can view assignments." on public.assignments;
create policy "Staff can view assignments." on public.assignments
  for select using (
    exists (
      select 1 from public.users viewer
      where viewer.id = auth.uid()
      and viewer.role = 'super-admin'
    )
    or exists (
      select 1
      from public.users viewer
      join public.applications a on a.id = assignments.application_id
      join public.job_forms jf on jf.id = a.job_form_id
      where viewer.id = auth.uid()
      and viewer.role in ('admin', 'reviewer')
      and viewer.organization_id is not null
      and jf.organization_id = viewer.organization_id
    )
  );

-- Insert policy:
-- - Super Admin can insert
-- - Admin can insert only within their organization
drop policy if exists "Admins can insert assignments" on public.assignments;
create policy "Admins can insert assignments" on public.assignments
  for insert with check (
    exists (
      select 1 from public.users viewer
      where viewer.id = auth.uid()
      and viewer.role = 'super-admin'
    )
    or exists (
      select 1
      from public.users viewer
      join public.applications a on a.id = assignments.application_id
      join public.job_forms jf on jf.id = a.job_form_id
      where viewer.id = auth.uid()
      and viewer.role = 'admin'
      and viewer.organization_id is not null
      and jf.organization_id = viewer.organization_id
    )
  );

-- Delete policy:
-- Admin/Super Admin allowed by requirement. (If you want "only cascade delete", remove this policy.)
drop policy if exists "Admins can delete assignments" on public.assignments;
create policy "Admins can delete assignments" on public.assignments
  for delete using (
    exists (
      select 1 from public.users viewer
      where viewer.id = auth.uid()
      and viewer.role in ('super-admin', 'admin')
    )
  );

-- 4) Immutability: block updates (MVP)
create or replace function public.prevent_assignment_update()
returns trigger as $$
begin
  raise exception 'Assignments are immutable after creation';
end;
$$ language plpgsql;

drop trigger if exists prevent_assignment_update_trigger on public.assignments;
create trigger prevent_assignment_update_trigger
  before update on public.assignments
  for each row execute procedure public.prevent_assignment_update();











