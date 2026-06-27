
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS twitter_url text DEFAULT '' ,
ADD COLUMN IF NOT EXISTS expected_graduation text DEFAULT '',
ADD COLUMN IF NOT EXISTS languages text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS resume_url text DEFAULT '',
ADD COLUMN IF NOT EXISTS about_me text DEFAULT '';
