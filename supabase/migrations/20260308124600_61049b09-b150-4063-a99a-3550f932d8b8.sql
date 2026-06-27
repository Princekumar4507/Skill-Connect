
-- Allow events_team and super_admin to delete any event
CREATE POLICY "Admin can delete events"
ON public.events FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'events_team'));

-- Allow community_moderator and super_admin to delete any community
CREATE POLICY "Admin can delete communities"
ON public.communities FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'community_moderator'));

-- Allow content_moderator and super_admin to delete any post
CREATE POLICY "Admin can delete posts"
ON public.posts FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'content_moderator'));
