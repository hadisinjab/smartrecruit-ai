-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Users Table (Extends auth.users, for Admin/Staff only as per requirement)
-- Note: 'organization_id' implies multi-tenancy. We'll add it but keep it simple for now.
create table public.users (
  id uuid not null references auth.users(id) on delete cascade primary key,
  email text not null,
  role text check (role in ('super-admin', 'admin', 'reviewer')) default 'reviewer',
  organization_id uuid, -- For future multi-tenancy or specific org grouping
  full_name text,
  avatar_url text,
  is_active boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.users enable row level security;

create policy "Users can view their own profile." on public.users
  for select using (auth.uid() = id);

-- Super Admins can view all users
create policy "Super Admins can view all users." on public.users
  for select using (
    exists (
      select 1 from public.users
      where users.id = auth.uid() and users.role = 'super-admin'
    )
  );

-- Staff can view users in their own organization
create policy "Staff can view users in their organization." on public.users
  for select using (
    exists (
      select 1 from public.users as staff
      where staff.id = auth.uid() 
      and staff.organization_id = users.organization_id
      and staff.role in ('admin', 'reviewer')
    )
  );

-- 2. Job Forms Table (نماذج الوظائف)
create table public.job_forms (
  id uuid default gen_random_uuid() primary key,
  organization_id uuid, -- Optional link to org
  title text not null,
  description text,
  status text check (status in ('draft', 'active', 'paused', 'closed', 'archived')) default 'draft',
  deadline timestamptz,
  evaluation_criteria jsonb, -- JSON for storing criteria weights/rules
  created_by uuid references public.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.job_forms enable row level security;

-- Public read for active jobs (for applicants)
create policy "Active jobs are viewable by everyone." on public.job_forms
  for select using (status = 'active' and (deadline is null or deadline > now()));

-- Staff read all
create policy "Staff can view all jobs." on public.job_forms
  for select using (
    exists (
      select 1 from public.users
      where users.id = auth.uid()
    )
  );

-- Admins modify
create policy "Admins can modify jobs." on public.job_forms
  for all using (
    exists (
      select 1 from public.users
      where users.id = auth.uid() and users.role in ('super-admin', 'admin')
    )
  );

-- 3. Questions Table (الأسئلة)
create table public.questions (
  id uuid default gen_random_uuid() primary key,
  job_form_id uuid references public.job_forms(id) on delete cascade,
  page_number integer default 1,
  type text not null, -- e.g., 'text', 'multiple_choice', 'file_upload', 'video', 'voice'
  label text not null,
  required boolean default false,
  config jsonb, -- JSON for options, validation rules, etc.
  order_index integer default 0,
  created_at timestamptz default now()
);

alter table public.questions enable row level security;

-- Public read for questions of active jobs
create policy "Questions for active jobs are public." on public.questions
  for select using (
    exists (
      select 1 from public.job_forms
      where job_forms.id = questions.job_form_id
        and job_forms.status = 'active'
        and (job_forms.deadline is null or job_forms.deadline > now())
    )
  );

-- Staff full access
create policy "Staff full access to questions." on public.questions
  for all using (
    exists (
      select 1 from public.users
      where users.id = auth.uid()
    )
  );

-- 4. Applications Table (الطلبات)
create table public.applications (
  id uuid default gen_random_uuid() primary key,
  job_form_id uuid references public.job_forms(id),
  candidate_email text, -- Store email to identify candidate if not logged in
  candidate_name text,
  status text check (status in ('new', 'screening', 'interview', 'offer', 'hired', 'rejected', 'duplicate')) default 'new',
  is_duplicate boolean default false,
  submitted_at timestamptz,
  -- Progress tracking (exact "where did the candidate stop?" visibility)
  last_progress_step text,
  last_progress_event text, -- e.g. 'enter', 'next', 'upload', etc.
  last_progress_at timestamptz,
  last_progress_meta jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.applications enable row level security;

-- Applicants can view their own application (if we link auth later, for now maybe by ID/Token)
-- Staff view all
create policy "Staff can view all applications." on public.applications
  for select using (
    exists (
      select 1 from public.users
      where users.id = auth.uid()
    )
  );
  
-- Allow insert for public (applicants submitting forms)
-- Note: You might want to restrict this via an edge function or anon key with limits
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

-- Application progress events (history)
create table public.application_progress_events (
  id uuid default gen_random_uuid() primary key,
  application_id uuid references public.applications(id) on delete cascade,
  step_id text not null,
  event_type text not null, -- 'enter' | 'next' | 'voice_started' | ...
  meta jsonb,
  created_at timestamptz default now()
);

alter table public.application_progress_events enable row level security;

create policy "Staff can view application progress events." on public.application_progress_events
  for select using (
    exists (
      select 1 from public.users
      where users.id = auth.uid()
    )
  );

-- Allow insert for public (applicants) so we can track progress even without auth.
create policy "Anyone can insert application progress events." on public.application_progress_events
  for insert with check (true);


-- 5. Answers Table (الإجابات)
create table public.answers (
  id uuid default gen_random_uuid() primary key,
  application_id uuid references public.applications(id) on delete cascade,
  question_id uuid references public.questions(id),
  value text, -- Text answer or selected option value
  voice_data jsonb, -- Metadata for voice/audio answers
  created_at timestamptz default now()
);

alter table public.answers enable row level security;

create policy "Staff can view answers." on public.answers
  for select using (
    exists (
      select 1 from public.users
      where users.id = auth.uid()
    )
  );
  
create policy "Anyone can insert answers." on public.answers
  for insert with check (true);

-- 6. Resumes Table (السيرة الذاتية)
create table public.resumes (
  id uuid default gen_random_uuid() primary key,
  application_id uuid references public.applications(id) on delete cascade,
  file_url text not null,
  parsed_data jsonb, -- Extracted info from CV
  created_at timestamptz default now()
);

alter table public.resumes enable row level security;

create policy "Staff can view resumes." on public.resumes
  for select using (
    exists (
      select 1 from public.users
      where users.id = auth.uid()
    )
  );
  
create policy "Anyone can upload resume." on public.resumes
  for insert with check (true);

-- 7. External Profiles Table (الملفات الخارجية)
create table public.external_profiles (
  id uuid default gen_random_uuid() primary key,
  application_id uuid references public.applications(id) on delete cascade,
  type text, -- 'linkedin', 'behance', 'github', etc.
  url text,
  parsed_data jsonb, -- Scraped/API data
  created_at timestamptz default now()
);

alter table public.external_profiles enable row level security;

create policy "Staff can view external profiles." on public.external_profiles
  for select using (
    exists (
      select 1 from public.users
      where users.id = auth.uid()
    )
  );

-- 8. Assignments Table (المهام)
create table public.assignments (
  id uuid default gen_random_uuid() primary key,
  application_id uuid references public.applications(id) on delete cascade,
  type text,
  text_fields text,
  link_fields text,
  created_at timestamptz default now()
);

alter table public.assignments enable row level security;

create policy "Staff can view assignments." on public.assignments
  for select using (
    exists (
      select 1 from public.users
      where users.id = auth.uid()
    )
  );

-- 9. Interviews Table (المقابلات)
create table public.interviews (
  id uuid default gen_random_uuid() primary key,
  application_id uuid references public.applications(id) on delete cascade,
  audio_or_video_url text,
  audio_analysis jsonb, -- Transcription, sentiment, etc.
  created_at timestamptz default now()
);

alter table public.interviews enable row level security;

create policy "Staff can view interviews." on public.interviews
  for select using (
    exists (
      select 1 from public.users
      where users.id = auth.uid()
    )
  );

-- 10. AI Evaluations Table (read-only)
create table public.ai_evaluations (
  id uuid default gen_random_uuid() primary key,
  application_id uuid references public.applications(id) on delete cascade,
  score numeric, -- Overall score
  ranking_score numeric,
  strengths text[],
  weaknesses text[],
  recommendation text,
  analysis jsonb, -- Detailed analysis
  created_at timestamptz default now()
);

alter table public.ai_evaluations enable row level security;

create policy "Staff can view ai evaluations." on public.ai_evaluations
  for select using (
    exists (
      select 1 from public.users
      where users.id = auth.uid()
    )
  );

-- 11. HR Evaluations Table (editable)
create table public.hr_evaluations (
  id uuid default gen_random_uuid() primary key,
  application_id uuid references public.applications(id) on delete cascade,
  evaluator_id uuid references public.users(id),
  hr_score numeric,
  hr_decision text check (hr_decision in ('approve', 'reject', 'hold', 'interview')),
  next_action_date date,
  hr_notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.hr_evaluations enable row level security;

create policy "Staff can manage hr evaluations." on public.hr_evaluations
  for all using (
    exists (
      select 1 from public.users
      where users.id = auth.uid()
    )
  );

-- 12b. Active Log (Admin Audit Log)
-- Dedicated audit log for admin actions (jobs/users/evaluations/etc.).
create table public.active_log (
  id uuid default gen_random_uuid() primary key,
  actor_id uuid references public.users(id),
  actor_role text, -- 'super-admin' | 'admin' | 'reviewer' | 'system'
  action text not null, -- e.g. 'job.create', 'job.update', 'user.delete'
  entity_type text not null, -- e.g. 'job', 'candidate', 'user', 'evaluation', 'system'
  entity_id uuid,
  job_form_id uuid references public.job_forms(id) on delete set null,
  application_id uuid references public.applications(id) on delete set null,
  metadata jsonb default '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz default now()
);

alter table public.active_log enable row level security;

-- Staff can read audit logs:
-- - Super Admin: sees all organizations
-- - Admin/Reviewer: sees only logs where actor belongs to the same organization
create policy "Staff can view active log." on public.active_log
  for select using (
    exists (
      select 1 from public.users viewer
      where viewer.id = auth.uid()
      and viewer.role = 'super-admin'
    )
    or exists (
      select 1
      from public.users viewer
      join public.users actor on actor.id = active_log.actor_id
      where viewer.id = auth.uid()
      and viewer.role in ('admin', 'reviewer')
      and viewer.organization_id is not null
      and actor.organization_id = viewer.organization_id
    )
  );

-- Staff can insert their own audit entries.
create policy "Staff can insert active log." on public.active_log
  for insert with check (
    actor_id = auth.uid()
    and exists (
      select 1 from public.users
      where users.id = auth.uid()
      and users.role in ('super-admin', 'admin', 'reviewer')
    )
  );

create index if not exists active_log_created_at_idx on public.active_log (created_at desc);
create index if not exists active_log_actor_id_idx on public.active_log (actor_id);
create index if not exists active_log_entity_idx on public.active_log (entity_type, entity_id);
create index if not exists active_log_job_form_id_idx on public.active_log (job_form_id);
create index if not exists active_log_application_id_idx on public.active_log (application_id);

-- 13. Notifications Table
create table public.notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade,
  type text,
  title text,
  content text,
  is_read boolean default false,
  created_at timestamptz default now()
);

alter table public.notifications enable row level security;

create policy "Users can view own notifications." on public.notifications
  for select using (auth.uid() = user_id);

create policy "Users can update own notifications." on public.notifications
  for update using (auth.uid() = user_id);

-- 14. System Settings Table
create table public.system_settings (
  key text primary key,
  value text,
  description text,
  updated_at timestamptz default now()
);

alter table public.system_settings enable row level security;

create policy "Admins can manage settings." on public.system_settings
  for all using (
    exists (
      select 1 from public.users
      where users.id = auth.uid() and users.role = 'super-admin'
    )
  );

-- Clean up any old triggers to avoid "duplicate key" errors
drop trigger if exists on_auth_user_created on auth.users;
drop trigger if exists on_auth_user_created_v2 on auth.users;

-- Trigger to handle new user signup -> public.users
create or replace function public.handle_new_auth_user()
returns trigger as $$
begin
  insert into public.users (id, email, full_name, avatar_url, role, organization_id)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    coalesce(new.raw_user_meta_data->>'role', 'reviewer'),
    (new.raw_user_meta_data->>'organization_id')::uuid
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created_v2
  after insert on auth.users
  for each row execute procedure public.handle_new_auth_user();

