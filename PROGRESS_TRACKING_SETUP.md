## Progress tracking (Where did the candidate stop?)

Right now the application UI moves through steps (`candidate`, `text-questions`, `media-questions`, `assignment`, `review`), but incomplete applications might not have answers saved yet.

To reliably show **exactly** where a candidate stopped, we store:
- `applications.last_progress_step`
- `applications.last_progress_event`
- `applications.last_progress_at`
- `applications.last_progress_meta`
- `application_progress_events` (history)

### 1) Run this SQL in Supabase (SQL Editor)

```sql
alter table public.applications
  add column if not exists last_progress_step text,
  add column if not exists last_progress_event text,
  add column if not exists last_progress_at timestamptz,
  add column if not exists last_progress_meta jsonb;

create table if not exists public.application_progress_events (
  id uuid default gen_random_uuid() primary key,
  application_id uuid references public.applications(id) on delete cascade,
  step_id text not null,
  event_type text not null,
  meta jsonb,
  created_at timestamptz default now()
);

alter table public.application_progress_events enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'application_progress_events'
      and policyname = 'Staff can view application progress events.'
  ) then
    create policy "Staff can view application progress events." on public.application_progress_events
      for select using (
        exists (select 1 from public.users where users.id = auth.uid())
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'application_progress_events'
      and policyname = 'Anyone can insert application progress events.'
  ) then
    create policy "Anyone can insert application progress events." on public.application_progress_events
      for insert with check (true);
  end if;
end $$;
```

### 2) Verify

- Start an application as an applicant.
- Navigate to `Text Questions`, then close the tab (do not submit).
- In admin candidate details, "Stopped at" should show `Text Questions`.


