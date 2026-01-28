-- 1. Add new optional columns to the public.applications table for more detailed candidate information.
-- These columns are all nullable by default, ensuring no impact on existing records.
ALTER TABLE public.applications
ADD COLUMN IF NOT EXISTS gender TEXT,
ADD COLUMN IF NOT EXISTS date_of_birth DATE,
ADD COLUMN IF NOT EXISTS nationality TEXT,
ADD COLUMN IF NOT EXISTS marital_status TEXT,
ADD COLUMN IF NOT EXISTS photo TEXT,
ADD COLUMN IF NOT EXISTS country TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS education_level TEXT,
ADD COLUMN IF NOT EXISTS university_name TEXT,
ADD COLUMN IF NOT EXISTS major TEXT,
ADD COLUMN IF NOT EXISTS degree_file TEXT,
ADD COLUMN IF NOT EXISTS languages JSONB,
ADD COLUMN IF NOT EXISTS available_start_date DATE;

-- 2. Add a jsonb column to public.job_forms to store the configuration of enabled fields.
-- This will allow admins to dynamically control which fields appear on the application form.
ALTER TABLE public.job_forms
ADD COLUMN IF NOT EXISTS enabled_fields JSONB;
