
-- Fix the overly permissive INSERT policy on notifications
-- Notifications are created by SECURITY DEFINER triggers, so we restrict direct inserts
DROP POLICY "System can create notifications" ON public.notifications;
CREATE POLICY "Users can create notifications for others"
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = actor_id);
