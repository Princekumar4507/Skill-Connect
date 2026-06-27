
-- post_bookmarks table
CREATE TABLE public.post_bookmarks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, post_id)
);
ALTER TABLE public.post_bookmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own bookmarks" ON public.post_bookmarks FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create bookmarks" ON public.post_bookmarks FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own bookmarks" ON public.post_bookmarks FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- post_reactions table
CREATE TABLE public.post_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL DEFAULT 'like',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, post_id, reaction_type)
);
ALTER TABLE public.post_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view reactions" ON public.post_reactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can add reactions" ON public.post_reactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove reactions" ON public.post_reactions FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- post_mentions table
CREATE TABLE public.post_mentions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  mentioned_user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(post_id, mentioned_user_id)
);
ALTER TABLE public.post_mentions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view mentions" ON public.post_mentions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create mentions" ON public.post_mentions FOR INSERT TO authenticated WITH CHECK (true);

-- polls table
CREATE TABLE public.polls (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  multiple_choice BOOLEAN NOT NULL DEFAULT false,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(post_id)
);
ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view polls" ON public.polls FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create polls" ON public.polls FOR INSERT TO authenticated WITH CHECK (true);

-- poll_options table
CREATE TABLE public.poll_options (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  poll_id UUID NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  option_text TEXT NOT NULL,
  vote_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.poll_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view poll options" ON public.poll_options FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create poll options" ON public.poll_options FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Vote count can be updated" ON public.poll_options FOR UPDATE TO authenticated USING (true);

-- poll_votes table
CREATE TABLE public.poll_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  poll_option_id UUID NOT NULL REFERENCES public.poll_options(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(poll_option_id, user_id)
);
ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view poll votes" ON public.poll_votes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can vote" ON public.poll_votes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove votes" ON public.poll_votes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Trigger for mention notifications
CREATE OR REPLACE FUNCTION public.notify_on_mention()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  post_author uuid;
BEGIN
  SELECT author_id INTO post_author FROM public.posts WHERE id = NEW.post_id;
  IF NEW.mentioned_user_id != COALESCE(post_author, '00000000-0000-0000-0000-000000000000') THEN
    INSERT INTO public.notifications (user_id, type, actor_id, post_id)
    VALUES (NEW.mentioned_user_id, 'mention', COALESCE(post_author, NEW.mentioned_user_id), NEW.post_id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_mention_notify
AFTER INSERT ON public.post_mentions
FOR EACH ROW EXECUTE FUNCTION public.notify_on_mention();

-- Trigger to update reaction notification (reuse like notification pattern)
CREATE OR REPLACE FUNCTION public.notify_on_reaction()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  post_author uuid;
BEGIN
  SELECT author_id INTO post_author FROM public.posts WHERE id = NEW.post_id;
  IF post_author IS NOT NULL AND post_author != NEW.user_id THEN
    INSERT INTO public.notifications (user_id, type, actor_id, post_id)
    VALUES (post_author, 'reaction', NEW.user_id, NEW.post_id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_reaction_notify
AFTER INSERT ON public.post_reactions
FOR EACH ROW EXECUTE FUNCTION public.notify_on_reaction();
