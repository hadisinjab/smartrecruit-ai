-- Add assignment configuration fields to job forms
-- (MVP config for enabling an assignment step during application)

alter table public.job_forms
  add column if not exists assignment_enabled boolean default false,
  add column if not exists assignment_required boolean default false,
  add column if not exists assignment_type text,
  add column if not exists assignment_description text,
  add column if not exists assignment_weight integer;

-- Optional: constrain assignment_type when enabled (soft; can be tightened later)
alter table public.job_forms
  drop constraint if exists job_forms_assignment_type_check;

alter table public.job_forms
  add constraint job_forms_assignment_type_check
  check (assignment_type is null or assignment_type in ('text_only', 'text_and_links'));






