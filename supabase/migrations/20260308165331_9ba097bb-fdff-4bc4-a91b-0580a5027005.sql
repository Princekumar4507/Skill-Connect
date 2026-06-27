
-- Add email_domain column to profiles
ALTER TABLE public.profiles ADD COLUMN email_domain text;

-- Create index on email_domain for admin filtering
CREATE INDEX idx_profiles_email_domain ON public.profiles(email_domain);

-- Backfill existing users' email_domain from auth.users
UPDATE public.profiles p
SET email_domain = split_part(u.email, '@', 2)
FROM auth.users u
WHERE p.user_id = u.id AND p.email_domain IS NULL;

-- Update handle_new_user to extract email_domain on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, avatar_url, email_domain)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
    split_part(NEW.email, '@', 2)
  );
  RETURN NEW;
END;
$function$;
