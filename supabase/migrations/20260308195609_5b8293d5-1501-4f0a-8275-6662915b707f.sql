
-- Study Groups table
CREATE TABLE public.study_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  subject TEXT NOT NULL DEFAULT '',
  invite_code TEXT NOT NULL DEFAULT substr(md5(random()::text), 1, 8),
  creator_id UUID NOT NULL,
  max_members INTEGER NOT NULL DEFAULT 10,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Study Group Members table
CREATE TABLE public.study_group_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.study_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(group_id, user_id)
);

-- Study Group Tasks table
CREATE TABLE public.study_group_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.study_groups(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'todo',
  assigned_to UUID,
  created_by UUID NOT NULL,
  due_date TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.study_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_group_tasks ENABLE ROW LEVEL SECURITY;

-- RLS for study_groups
CREATE POLICY "Anyone can view study groups" ON public.study_groups FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create study groups" ON public.study_groups FOR INSERT WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Creators can update their study groups" ON public.study_groups FOR UPDATE USING (auth.uid() = creator_id);
CREATE POLICY "Creators can delete their study groups" ON public.study_groups FOR DELETE USING (auth.uid() = creator_id);

-- RLS for study_group_members
CREATE POLICY "Anyone can view study group members" ON public.study_group_members FOR SELECT USING (true);
CREATE POLICY "Authenticated users can join study groups" ON public.study_group_members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can leave study groups" ON public.study_group_members FOR DELETE USING (auth.uid() = user_id);

-- RLS for study_group_tasks
CREATE POLICY "Members can view tasks" ON public.study_group_tasks FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.study_group_members WHERE group_id = study_group_tasks.group_id AND user_id = auth.uid())
);
CREATE POLICY "Members can create tasks" ON public.study_group_tasks FOR INSERT WITH CHECK (
  auth.uid() = created_by AND EXISTS (SELECT 1 FROM public.study_group_members WHERE group_id = study_group_tasks.group_id AND user_id = auth.uid())
);
CREATE POLICY "Members can update tasks" ON public.study_group_tasks FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.study_group_members WHERE group_id = study_group_tasks.group_id AND user_id = auth.uid())
);
CREATE POLICY "Task creators can delete tasks" ON public.study_group_tasks FOR DELETE USING (auth.uid() = created_by);

-- Auto-add creator as admin member
CREATE OR REPLACE FUNCTION public.auto_join_study_group_creator()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.study_group_members (group_id, user_id, role)
  VALUES (NEW.id, NEW.creator_id, 'admin');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_study_group_created
  AFTER INSERT ON public.study_groups
  FOR EACH ROW EXECUTE FUNCTION public.auto_join_study_group_creator();

-- Updated at trigger
CREATE TRIGGER update_study_groups_updated_at
  BEFORE UPDATE ON public.study_groups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_study_group_tasks_updated_at
  BEFORE UPDATE ON public.study_group_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
