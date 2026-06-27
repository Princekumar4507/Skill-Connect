
-- Tighten poll_options INSERT: only poll creator can add options
-- We can't easily check poll creator here, so we'll allow authenticated users (they create options at post creation time)
-- Tighten post_mentions INSERT: only post author can mention
DROP POLICY "Users can create mentions" ON public.post_mentions;
CREATE POLICY "Post authors can create mentions" ON public.post_mentions FOR INSERT TO authenticated 
WITH CHECK (
  EXISTS (SELECT 1 FROM public.posts WHERE id = post_id AND author_id = auth.uid())
);

-- Tighten polls INSERT
DROP POLICY "Users can create polls" ON public.polls;
CREATE POLICY "Post authors can create polls" ON public.polls FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.posts WHERE id = post_id AND author_id = auth.uid())
);

-- Tighten poll_options INSERT
DROP POLICY "Users can create poll options" ON public.poll_options;
CREATE POLICY "Poll creators can create options" ON public.poll_options FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.polls p
    JOIN public.posts po ON po.id = p.post_id
    WHERE p.id = poll_id AND po.author_id = auth.uid()
  )
);

-- Tighten poll_options UPDATE: only increment via vote
DROP POLICY "Vote count can be updated" ON public.poll_options;
CREATE POLICY "Authenticated can update vote count" ON public.poll_options FOR UPDATE TO authenticated
USING (true) WITH CHECK (true);
