ALTER TABLE public.posts DROP CONSTRAINT posts_type_check;
ALTER TABLE public.posts ADD CONSTRAINT posts_type_check CHECK (type IN ('project', 'question', 'event', 'poll'));