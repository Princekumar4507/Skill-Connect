
-- Add read_at column to messages table
ALTER TABLE public.messages ADD COLUMN read_at timestamptz DEFAULT NULL;

-- Allow conversation members to update read_at on messages sent TO them
CREATE POLICY "Recipients can mark messages as read"
ON public.messages
FOR UPDATE
TO authenticated
USING (
  is_conversation_member(auth.uid(), conversation_id)
  AND sender_id != auth.uid()
)
WITH CHECK (
  is_conversation_member(auth.uid(), conversation_id)
  AND sender_id != auth.uid()
);
