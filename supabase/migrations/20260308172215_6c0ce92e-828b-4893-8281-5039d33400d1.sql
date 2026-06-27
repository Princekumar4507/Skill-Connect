
-- Drop all existing restrictive policies on connections
DROP POLICY IF EXISTS "Users can send connection requests" ON public.connections;
DROP POLICY IF EXISTS "Users can view their connections" ON public.connections;
DROP POLICY IF EXISTS "Users can respond to connection requests" ON public.connections;
DROP POLICY IF EXISTS "Users can delete their connections" ON public.connections;

-- Recreate as PERMISSIVE policies
CREATE POLICY "Users can send connection requests"
ON public.connections FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can view their connections"
ON public.connections FOR SELECT
TO authenticated
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can respond to connection requests"
ON public.connections FOR UPDATE
TO authenticated
USING (auth.uid() = receiver_id);

CREATE POLICY "Users can delete their connections"
ON public.connections FOR DELETE
TO authenticated
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
