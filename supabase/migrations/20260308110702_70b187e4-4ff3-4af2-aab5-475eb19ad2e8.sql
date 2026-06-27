
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone text DEFAULT '',
  ADD COLUMN IF NOT EXISTS location text DEFAULT '',
  ADD COLUMN IF NOT EXISTS interests text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS achievements jsonb DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS portfolio_url text DEFAULT '',
  ADD COLUMN IF NOT EXISTS cgpa text DEFAULT '',
  ADD COLUMN IF NOT EXISTS enrollment_number text DEFAULT '';
