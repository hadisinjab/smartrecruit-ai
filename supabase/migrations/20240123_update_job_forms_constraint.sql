-- Drop the existing constraint
ALTER TABLE job_forms DROP CONSTRAINT IF EXISTS job_forms_assignment_type_check;

-- Add the updated constraint including 'video_upload'
ALTER TABLE job_forms ADD CONSTRAINT job_forms_assignment_type_check 
CHECK (assignment_type IN ('text_only', 'text_and_links', 'video_upload'));
