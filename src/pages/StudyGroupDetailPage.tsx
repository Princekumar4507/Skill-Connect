import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Copy, Plus, Users, CheckCircle2, Circle, Clock, Trash2 } from "lucide-react";
import { toast } from "sonner";

const statusConfig: Record<string, { label: string; icon: any; color: string }> = {
  todo: { label: "To Do", icon: Circle, color: "text-muted-foreground" },
  in_progress: { label: "In Progress", icon: Clock, color: "text-yellow-500" },
  done: { label: "Done", icon: CheckCircle2, color: "text-green-500" },
};

const StudyGroupDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [group, setGroup] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMember, setIsMember] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [taskForm, setTaskForm] = useState({ title: "", description: "", due_date: "", assigned_to: "" });
  const [tab, setTab] = useState<"tasks" | "members">("tasks");
  const [copiedCode, setCopiedCode] = useState(false);

  const fetchAll = async () => {
    if (!id || !user) return;
    setLoading(true);

    const [{ data: g }, { data: mems }, { data: t }] = await Promise.all([
      supabase.from("study_groups").select("*").eq("id", id).maybeSingle(),
      supabase.from("study_group_members").select("*, profiles:user_id(full_name, avatar_url, college)").eq("group_id", id),
      supabase.from("study_group_tasks").select("*").eq("group_id", id).order("created_at", { ascending: false }),
    ]);

    setGroup(g);
    setMembers(mems || []);
    setTasks(t || []);
    setIsMember((mems || []).some((m: any) => m.user_id === user.id));
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, [id, user]);

  const copyInviteCode = () => {
    if (!group) return;
    navigator.clipboard.writeText(group.invite_code);
    setCopiedCode(true);
    toast.success("Invite code copied!");
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleAddTask = async () => {
    if (!user || !id || !taskForm.title.trim()) return;
    const { error } = await supabase.from("study_group_tasks").insert({
      group_id: id,
      title: taskForm.title.trim(),
      description: taskForm.description.trim(),
      due_date: taskForm.due_date || null,
      assigned_to: taskForm.assigned_to || null,
      created_by: user.id,
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Task added!");
      setShowAddTask(false);
      setTaskForm({ title: "", description: "", due_date: "", assigned_to: "" });
      fetchAll();
    }
  };

  const updateTaskStatus = async (taskId: string, status: string) => {
    const { error } = await supabase.from("study_group_tasks").update({ status }).eq("id", taskId);
    if (error) toast.error(error.message);
    else setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status } : t)));
  };

  const deleteTask = async (taskId: string) => {
    const { error } = await supabase.from("study_group_tasks").delete().eq("id", taskId);
    if (error) toast.error(error.message);
    else { toast.success("Task deleted"); setTasks((prev) => prev.filter((t) => t.id !== taskId)); }
  };

  const handleLeave = async () => {
    if (!user || !id) return;
    await supabase.from("study_group_members").delete().eq("group_id", id).eq("user_id", user.id);
    toast.success("Left group");
    navigate("/study-groups");
  };

  if (loading) return (
    <Layout>
      <div className="flex justify-center py-20">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    </Layout>
  );

  if (!group) return (
    <Layout>
      <div className="container py-12 text-center">
        <p className="text-muted-foreground">Group not found</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/study-groups")}>Back</Button>
      </div>
    </Layout>
  );

  const memberMap = Object.fromEntries(members.map((m: any) => [m.user_id, m.profiles]));

  return (
    <Layout>
      <div className="container py-6 max-w-4xl">
        {/* Header */}
        <button onClick={() => navigate("/study-groups")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4" /> Back to Study Groups
        </button>

        <div className="bg-card border rounded-xl p-6 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">{group.name}</h1>
              {group.subject && <span className="text-sm bg-primary/10 text-primary px-2 py-1 rounded-full inline-block mt-1">{group.subject}</span>}
              {group.description && <p className="text-muted-foreground mt-2">{group.description}</p>}
            </div>
            <div className="flex items-center gap-2">
              {isMember && (
                <Button variant="outline" size="sm" onClick={copyInviteCode}>
                  {copiedCode ? <CheckCircle2 className="h-4 w-4 mr-1 text-green-500" /> : <Copy className="h-4 w-4 mr-1" />}
                  {copiedCode ? "Copied!" : group.invite_code}
                </Button>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4 mt-4">
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              <Users className="h-4 w-4" /> {members.length}/{group.max_members} members
            </span>
            {isMember && group.creator_id !== user?.id && (
              <Button variant="ghost" size="sm" className="text-destructive" onClick={handleLeave}>Leave Group</Button>
            )}
          </div>
        </div>

        {!isMember ? (
          <div className="text-center py-12 bg-card border rounded-xl">
            <p className="text-muted-foreground mb-4">You're not a member of this group</p>
            <Button className="gradient-primary" onClick={async () => {
              if (!user || !id) return;
              const { error } = await supabase.from("study_group_members").insert({ group_id: id, user_id: user.id });
              if (error) toast.error(error.message);
              else { toast.success("Joined!"); fetchAll(); }
            }}>Join Group</Button>
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div className="flex gap-2 mb-4">
              {(["tasks", "members"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    tab === t ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t === "tasks" ? `Tasks (${tasks.length})` : `Members (${members.length})`}
                </button>
              ))}
            </div>

            {tab === "tasks" ? (
              <div>
                <div className="flex justify-end mb-4">
                  <Button size="sm" className="gradient-primary" onClick={() => setShowAddTask(true)}>
                    <Plus className="h-4 w-4 mr-1" /> Add Task
                  </Button>
                </div>

                {tasks.length === 0 ? (
                  <div className="text-center py-12 bg-card border rounded-xl">
                    <p className="text-muted-foreground">No tasks yet. Add one to get started!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {tasks.map((task: any) => {
                      const cfg = statusConfig[task.status] || statusConfig.todo;
                      const StatusIcon = cfg.icon;
                      const assignee = task.assigned_to ? memberMap[task.assigned_to] : null;
                      return (
                        <div key={task.id} className="bg-card border rounded-lg p-4 flex items-start gap-3">
                          <button onClick={() => {
                            const next = task.status === "todo" ? "in_progress" : task.status === "in_progress" ? "done" : "todo";
                            updateTaskStatus(task.id, next);
                          }}>
                            <StatusIcon className={`h-5 w-5 mt-0.5 ${cfg.color}`} />
                          </button>
                          <div className="flex-1 min-w-0">
                            <p className={`font-medium text-foreground ${task.status === "done" ? "line-through opacity-60" : ""}`}>{task.title}</p>
                            {task.description && <p className="text-sm text-muted-foreground mt-1">{task.description}</p>}
                            <div className="flex items-center gap-3 mt-2">
                              {task.due_date && <span className="text-xs text-muted-foreground">Due: {task.due_date}</span>}
                              {assignee && (
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Avatar className="h-4 w-4">
                                    {assignee.avatar_url && <AvatarImage src={assignee.avatar_url} />}
                                    <AvatarFallback className="text-[8px]">{assignee.full_name?.[0]}</AvatarFallback>
                                  </Avatar>
                                  {assignee.full_name}
                                </span>
                              )}
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                task.status === "done" ? "bg-green-500/10 text-green-600" :
                                task.status === "in_progress" ? "bg-yellow-500/10 text-yellow-600" :
                                "bg-secondary text-muted-foreground"
                              }`}>{cfg.label}</span>
                            </div>
                          </div>
                          {task.created_by === user?.id && (
                            <button onClick={() => deleteTask(task.id)} className="text-muted-foreground hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {members.map((m: any) => (
                  <div key={m.id} className="bg-card border rounded-lg p-4 flex items-center gap-3 cursor-pointer hover:shadow-sm" onClick={() => navigate(`/user/${m.user_id}`)}>
                    <Avatar className="h-10 w-10">
                      {m.profiles?.avatar_url && <AvatarImage src={m.profiles.avatar_url} />}
                      <AvatarFallback className="gradient-primary text-primary-foreground text-xs">
                        {m.profiles?.full_name?.[0] || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium text-foreground">{m.profiles?.full_name || "Unknown"}</p>
                      {m.profiles?.college && <p className="text-xs text-muted-foreground">{m.profiles.college}</p>}
                    </div>
                    {m.role === "admin" && (
                      <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">Admin</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Add Task Dialog */}
      <Dialog open={showAddTask} onOpenChange={setShowAddTask}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Task</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Input placeholder="Task title" value={taskForm.title} onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })} />
            <Textarea placeholder="Description (optional)" value={taskForm.description} onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })} />
            <Input type="date" placeholder="Due date" value={taskForm.due_date} onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value })} />
            <Select value={taskForm.assigned_to} onValueChange={(v) => setTaskForm({ ...taskForm, assigned_to: v })}>
              <SelectTrigger><SelectValue placeholder="Assign to (optional)" /></SelectTrigger>
              <SelectContent>
                {members.map((m: any) => (
                  <SelectItem key={m.user_id} value={m.user_id}>{m.profiles?.full_name || "Unknown"}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddTask(false)}>Cancel</Button>
            <Button onClick={handleAddTask} disabled={!taskForm.title.trim()} className="gradient-primary">Add Task</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default StudyGroupDetailPage;
