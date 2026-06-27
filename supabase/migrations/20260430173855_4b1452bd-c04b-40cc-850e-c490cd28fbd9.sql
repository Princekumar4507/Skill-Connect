-- Lost & Found items table
CREATE TABLE public.lost_found_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('lost', 'found')),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  image_url TEXT,
  location TEXT NOT NULL DEFAULT '',
  item_date DATE,
  category TEXT NOT NULL DEFAULT 'Other' CHECK (category IN ('Electronics', 'Books', 'ID Card', 'Clothing', 'Accessories', 'Keys', 'Other')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.lost_found_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view items"
  ON public.lost_found_items FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can create own items"
  ON public.lost_found_items FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own items"
  ON public.lost_found_items FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own items"
  ON public.lost_found_items FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admins can delete any item"
  ON public.lost_found_items FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'content_moderator'::app_role));

CREATE TRIGGER update_lost_found_items_updated_at
  BEFORE UPDATE ON public.lost_found_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_lost_found_items_created ON public.lost_found_items (created_at DESC);
CREATE INDEX idx_lost_found_items_type ON public.lost_found_items (type);
CREATE INDEX idx_lost_found_items_status ON public.lost_found_items (status);

-- Lost & Found comments table
CREATE TABLE public.lost_found_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID NOT NULL REFERENCES public.lost_found_items(id) ON DELETE CASCADE,
  author_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.lost_found_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view comments"
  ON public.lost_found_comments FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can create comments"
  ON public.lost_found_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can delete own comments"
  ON public.lost_found_comments FOR DELETE TO authenticated USING (auth.uid() = author_id);

CREATE POLICY "Admins can delete any comment"
  ON public.lost_found_comments FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'content_moderator'::app_role));

CREATE INDEX idx_lost_found_comments_item ON public.lost_found_comments (item_id, created_at);