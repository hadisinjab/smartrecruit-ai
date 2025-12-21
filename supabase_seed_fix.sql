
-- Allow service role key to bypass RLS for seeding data
ALTER TABLE public.applications FORCE ROW LEVEL SECURITY;
ALTER TABLE public.job_forms FORCE ROW LEVEL SECURITY;
ALTER TABLE public.hr_evaluations FORCE ROW LEVEL SECURITY;

-- Note: The service role key automatically bypasses RLS in Supabase.
-- The error 42501 usually happens when using the ANON key or an authenticated user that doesn't meet policy requirements.
-- Since we are using the service role key in the script (or falling back to anon if missing), we need to ensure the script uses the SERVICE ROLE KEY correctly.

-- If the script falls back to ANON key because SERVICE_ROLE_KEY is missing in .env.local, then these policies are needed for ANON:

-- Allow Anon to insert into job_forms (only for seeding/testing purposes, should be removed in prod)
CREATE POLICY "Enable insert for anon (seeding)" ON public.job_forms FOR INSERT WITH CHECK (true);

-- Allow Anon to insert into hr_evaluations (only for seeding/testing purposes)
CREATE POLICY "Enable insert for anon (seeding)" ON public.hr_evaluations FOR INSERT WITH CHECK (true);

-- Applications table already has "Anyone can create application" policy, so that should be fine.
