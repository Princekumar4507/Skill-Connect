
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cover_url text DEFAULT '';

-- Create cover-images storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('cover-images', 'cover-images', true) ON CONFLICT (id) DO NOTHING;

-- RLS for cover-images bucket
CREATE POLICY "Anyone can view cover images" ON storage.objects FOR SELECT USING (bucket_id = 'cover-images');
CREATE POLICY "Authenticated users can upload cover images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'cover-images' AND auth.uid() IS NOT NULL);
CREATE POLICY "Users can update own cover images" ON storage.objects FOR UPDATE USING (bucket_id = 'cover-images' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users can delete own cover images" ON storage.objects FOR DELETE USING (bucket_id = 'cover-images' AND (storage.foldername(name))[1] = auth.uid()::text);
