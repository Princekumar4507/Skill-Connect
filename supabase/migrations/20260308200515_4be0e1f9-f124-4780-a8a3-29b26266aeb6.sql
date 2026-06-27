
-- Resources table
CREATE TABLE public.resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uploader_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  subject TEXT NOT NULL DEFAULT 'General',
  category TEXT NOT NULL DEFAULT 'Notes',
  semester TEXT NOT NULL DEFAULT '',
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL DEFAULT 0,
  file_type TEXT NOT NULL DEFAULT '',
  downloads INTEGER NOT NULL DEFAULT 0,
  upvotes INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;

-- Resource votes table
CREATE TABLE public.resource_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  vote_type TEXT NOT NULL DEFAULT 'upvote',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(resource_id, user_id)
);

ALTER TABLE public.resource_votes ENABLE ROW LEVEL SECURITY;

-- RLS for resources
CREATE POLICY "Anyone can view resources" ON public.resources FOR SELECT USING (true);
CREATE POLICY "Authenticated users can upload resources" ON public.resources FOR INSERT WITH CHECK (auth.uid() = uploader_id);
CREATE POLICY "Uploaders can update their resources" ON public.resources FOR UPDATE USING (auth.uid() = uploader_id);
CREATE POLICY "Uploaders can delete their resources" ON public.resources FOR DELETE USING (auth.uid() = uploader_id);

-- RLS for resource_votes
CREATE POLICY "Anyone can view votes" ON public.resource_votes FOR SELECT USING (true);
CREATE POLICY "Users can vote" ON public.resource_votes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove vote" ON public.resource_votes FOR DELETE USING (auth.uid() = user_id);

-- Storage bucket for resource files
INSERT INTO storage.buckets (id, name, public) VALUES ('resources', 'resources', true);

-- Storage policies
CREATE POLICY "Anyone can view resources files" ON storage.objects FOR SELECT USING (bucket_id = 'resources');
CREATE POLICY "Authenticated users can upload resources files" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'resources' AND auth.uid() IS NOT NULL);
CREATE POLICY "Users can delete own resource files" ON storage.objects FOR DELETE USING (bucket_id = 'resources' AND auth.uid() IS NOT NULL);

-- Updated at trigger
CREATE TRIGGER update_resources_updated_at BEFORE UPDATE ON public.resources FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
