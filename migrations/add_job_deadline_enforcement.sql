-- ========================================
-- Migration: Add job_forms.deadline + enforce deadline for public applications
-- ========================================

-- 1) Add deadline column (used by Admin UI + enforcement)
alter table public.job_forms
  add column if not exists deadline timestamptz;

-- 2) Update public visibility: only active AND not expired
drop policy if exists "Active jobs are viewable by everyone." on public.job_forms;
create policy "Active jobs are viewable by everyone." on public.job_forms
  for select using (
    status = 'active'
    and (deadline is null or deadline > now())
  );

-- 3) Update public questions visibility: only for active AND not expired jobs
drop policy if exists "Questions for active jobs are public." on public.questions;
create policy "Questions for active jobs are public." on public.questions
  for select using (
    exists (
      select 1
      from public.job_forms
      where job_forms.id = questions.job_form_id
        and job_forms.status = 'active'
        and (job_forms.deadline is null or job_forms.deadline > now())
    )
  );

-- 4) Lock down public application creation: only for active AND not expired jobs
drop policy if exists "Anyone can create application." on public.applications;
create policy "Anyone can create application." on public.applications
  for insert with check (
    exists (
      select 1
      from public.job_forms
      where job_forms.id = applications.job_form_id
        and job_forms.status = 'active'
        and (job_forms.deadline is null or job_forms.deadline > now())
    )
  );

-- ========================================
-- Migration Complete!
-- ========================================








