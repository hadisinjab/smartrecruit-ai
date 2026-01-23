-- Add new columns to applications table
ALTER TABLE applications 
ADD COLUMN candidate_phone TEXT,
ADD COLUMN candidate_age INTEGER,
ADD COLUMN experience INTEGER;
