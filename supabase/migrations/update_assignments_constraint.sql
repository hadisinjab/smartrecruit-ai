-- Drop the existing constraint
ALTER TABLE assignments DROP CONSTRAINT IF EXISTS assignments_type_check;

-- Add the updated constraint including 'video_upload'
ALTER TABLE assignments 
ADD CONSTRAINT assignments_type_check 
CHECK (type IN ('text_only', 'text_and_links', 'video_upload'));
