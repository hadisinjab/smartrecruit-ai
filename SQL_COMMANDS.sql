-- Enable RLS on applications table
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

-- Allow public (anonymous users) to insert new applications
CREATE POLICY "Enable insert for everyone" ON applications
FOR INSERT
WITH CHECK (true);

-- Enable RLS on answers table
ALTER TABLE answers ENABLE ROW LEVEL SECURITY;

-- Allow public to insert answers
CREATE POLICY "Enable insert for everyone" ON answers
FOR INSERT
WITH CHECK (true);

-- Enable RLS on resumes table
ALTER TABLE resumes ENABLE ROW LEVEL SECURITY;

-- Allow public to insert resumes metadata
CREATE POLICY "Enable insert for everyone" ON resumes
FOR INSERT
WITH CHECK (true);

-- Allow public to upload files (resumes)
INSERT INTO storage.buckets (id, name, public) VALUES ('resumes', 'resumes', true) ON CONFLICT DO NOTHING;

-- Update 'resumes' bucket to allow documents
UPDATE storage.buckets
SET allowed_mime_types = ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
WHERE id = 'resumes';

CREATE POLICY "Give public insert access to resumes" ON storage.objects
FOR INSERT
WITH CHECK ( bucket_id = 'resumes' );

CREATE POLICY "Give public read access to resumes" ON storage.objects
FOR SELECT
USING ( bucket_id = 'resumes' );

-- Allow public to upload voice files to 'files' bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('files', 'files', true) ON CONFLICT DO NOTHING;

-- Update 'files' bucket to allow audio files (fixing "mime type not supported" error)
UPDATE storage.buckets
SET allowed_mime_types = ARRAY['audio/webm', 'audio/wav', 'audio/mp3', 'audio/mpeg', 'audio/ogg', 'application/pdf', 'image/jpeg', 'image/png']
WHERE id = 'files';

CREATE POLICY "Give public insert access to voice files" ON storage.objects
FOR INSERT
WITH CHECK ( bucket_id = 'files' AND name LIKE 'voice/%' );

CREATE POLICY "Give public read access to voice files" ON storage.objects
FOR SELECT
USING ( bucket_id = 'files' AND name LIKE 'voice/%' );
