
-- Create resumes storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('resumes', 'resumes', true);

-- Allow authenticated users to upload their own resume
CREATE POLICY "Users can upload their own resume"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'resumes' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow authenticated users to update their own resume
CREATE POLICY "Users can update their own resume"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'resumes' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow authenticated users to delete their own resume
CREATE POLICY "Users can delete their own resume"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'resumes' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow anyone to view resumes (public bucket)
CREATE POLICY "Anyone can view resumes"
ON storage.objects FOR SELECT
USING (bucket_id = 'resumes');
