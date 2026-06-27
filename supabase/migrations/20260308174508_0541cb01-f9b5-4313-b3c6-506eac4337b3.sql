
-- Fix conversations INSERT policy - change from restrictive to permissive
DROP POLICY IF EXISTS "Authenticated users can create conversations" ON public.conversations;
CREATE POLICY "Authenticated users can create conversations"
ON public.conversations
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- Also fix conversation_participants INSERT policy
DROP POLICY IF EXISTS "Authenticated users can add participants" ON public.conversation_participants;
CREATE POLICY "Authenticated users can add participants"
ON public.conversation_participants
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);
