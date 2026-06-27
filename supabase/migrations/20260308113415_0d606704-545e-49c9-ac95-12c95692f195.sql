
-- Community discussion posts
CREATE TABLE public.community_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;

-- Anyone can view posts in communities
CREATE POLICY "Anyone can view community posts" ON public.community_posts FOR SELECT USING (true);

-- Only members can post
CREATE POLICY "Members can create community posts" ON public.community_posts FOR INSERT 
WITH CHECK (
  auth.uid() = author_id 
  AND EXISTS (
    SELECT 1 FROM public.community_members 
    WHERE community_id = community_posts.community_id 
    AND user_id = auth.uid()
  )
);

-- Authors can delete their own posts
CREATE POLICY "Authors can delete own community posts" ON public.community_posts FOR DELETE 
USING (auth.uid() = author_id);

-- Enable realtime for community_posts
ALTER PUBLICATION supabase_realtime ADD TABLE public.community_posts;
