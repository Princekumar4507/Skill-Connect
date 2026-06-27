
-- Step 1: Create get_user_conversations function
CREATE OR REPLACE FUNCTION public.get_user_conversations(p_user_id uuid)
RETURNS TABLE(
  conversation_id uuid,
  conversation_updated_at timestamptz,
  other_user_id uuid,
  other_full_name text,
  other_avatar_url text,
  other_college text,
  last_message_content text,
  last_message_created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    c.id AS conversation_id,
    c.updated_at AS conversation_updated_at,
    other_p.user_id AS other_user_id,
    other_p.full_name AS other_full_name,
    other_p.avatar_url AS other_avatar_url,
    other_p.college AS other_college,
    lm.content AS last_message_content,
    lm.created_at AS last_message_created_at
  FROM conversations c
  JOIN conversation_participants cp_me ON cp_me.conversation_id = c.id AND cp_me.user_id = p_user_id
  JOIN conversation_participants cp_other ON cp_other.conversation_id = c.id AND cp_other.user_id != p_user_id
  JOIN profiles other_p ON other_p.user_id = cp_other.user_id
  LEFT JOIN LATERAL (
    SELECT m.content, m.created_at
    FROM messages m
    WHERE m.conversation_id = c.id
    ORDER BY m.created_at DESC
    LIMIT 1
  ) lm ON true
  ORDER BY c.updated_at DESC;
$$;

-- Step 2: Add performance indexes
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON public.posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON public.messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_connections_sender_id ON public.connections(sender_id);
CREATE INDEX IF NOT EXISTS idx_connections_receiver_id ON public.connections(receiver_id);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_conv_user ON public.conversation_participants(conversation_id, user_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_post_id ON public.post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_post_id ON public.post_comments(post_id);
