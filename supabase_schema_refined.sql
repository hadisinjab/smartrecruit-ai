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
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.users enable row level security;

create policy "Users can view their own profile." on public.users
  for select using (auth.uid() = id);

-- Admins can view all users
create policy "Admins can view all users." on public.users
  for select using (
    exists (
      select 1 from public.users
      where users.id = auth.uid() and users.role in ('super-admin', 'admin')
    )
  );

-- 2. Job Forms Table (نماذج الوظائف)
create table public.job_forms (
  id uuid default gen_random_uuid() primary key,
  organization_id uuid, -- Optional link to org
  title text not null,
  description text,
  status text check (status in ('draft', 'active', 'paused', 'closed', 'archived')) default 'draft',
  evaluation_criteria jsonb, -- JSON for storing criteria weights/rules
  created_by uuid references public.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.job_forms enable row level security;

-- Public read for active jobs (for applicants)
create policy "Active jobs are viewable by everyone." on public.job_forms
  for select using (status = 'active');

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
      where job_forms.id = questions.job_form_id and job_forms.status = 'active'
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

-- 12. Activity Logs Table
create table public.activity_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id),
  action text not null,
  target_type text, -- 'job', 'application', 'candidate'
  target_id uuid,
  details jsonb,
  ip_address text,
  created_at timestamptz default now()
);

alter table public.activity_logs enable row level security;

create policy "Admins can view logs." on public.activity_logs
  for select using (
    exists (
      select 1 from public.users
      where users.id = auth.uid() and users.role in ('super-admin', 'admin')
    )
  );

create policy "System can insert logs." on public.activity_logs
  for insert with check (true);

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

-- Trigger to handle new user signup -> public.users
create or replace function public.handle_new_auth_user()
returns trigger as $$
begin
  insert into public.users (id, email, full_name, avatar_url, role)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    coalesce(new.raw_user_meta_data->>'role', 'reviewer') -- Default role
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created_v2
  after insert on auth.users
  for each row execute procedure public.handle_new_auth_user();

