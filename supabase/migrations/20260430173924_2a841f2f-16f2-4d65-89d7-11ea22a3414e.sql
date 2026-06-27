INSERT INTO storage.buckets (id, name, public) VALUES ('lost-found-images', 'lost-found-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Lost & Found images are public"
  ON storage.objects FOR SELECT USING (bucket_id = 'lost-found-images');

CREATE POLICY "Users upload own lost-found images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'lost-found-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users update own lost-found images"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'lost-found-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users delete own lost-found images"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'lost-found-images' AND auth.uid()::text = (storage.foldername(name))[1]);