-- ========================================
-- Migration: Add Interview Constraints and RLS Policies
-- ========================================

-- Step 0: ensure RLS enabled
alter table public.interviews enable row level security;

-- Step 1: Add indexes for faster queries
create index if not exists idx_interviews_application_id
on public.interviews(application_id);

create index if not exists idx_interviews_created_at
on public.interviews(created_at desc);

-- Step 2: Add/refresh RLS policies

drop policy if exists "Staff can view interviews" on public.interviews;
create policy "Staff can view interviews"
on public.interviews
for select
using (
  exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.role in ('super-admin', 'admin', 'reviewer')
  )
);

drop policy if exists "Admins can insert interviews" on public.interviews;
create policy "Admins can insert interviews"
on public.interviews
for insert
with check (
  exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.role in ('super-admin', 'admin')
  )
);

drop policy if exists "Admins can delete interviews" on public.interviews;
create policy "Admins can delete interviews"
on public.interviews
for delete
using (
  exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.role in ('super-admin', 'admin')
  )
);

drop policy if exists "Admins can update interviews" on public.interviews;
create policy "Admins can update interviews"
on public.interviews
for update
using (
  exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.role in ('super-admin', 'admin')
  )
);

-- Step 3: Add comments
comment on table public.interviews is 'Stores interview recordings and AI analysis results';
comment on column public.interviews.audio_or_video_url is 'URL to interview recording (YouTube, Drive, direct link, etc.)';
comment on column public.interviews.audio_analysis is 'AI-generated analysis of interview performance (JSON)';

-- ========================================
-- Migration Complete!
-- ========================================










