-- Add assignment_timing column to job_forms table
ALTER TABLE job_forms 
ADD COLUMN IF NOT EXISTS assignment_timing VARCHAR(50) DEFAULT 'before' CHECK (assignment_timing IN ('before', 'after'));