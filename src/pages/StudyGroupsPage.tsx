import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Search, Plus, Users, BookOpen, Copy, Check } from "lucide-react";
import { toast } from "sonner";

const StudyGroupsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [groups, setGroups] = useState<any[]>([]);
  const [myGroups, setMyGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [tab, setTab] = useState<"my" | "discover">("my");
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [form, setForm] = useState({ name: "", description: "", subject: "", max_members: 10 });
  const [creating, setCreating] = useState(false);

  const fetchGroups = async () => {
    if (!user) return;
    setLoading(true);

    const [{ data: allGroups }, { data: memberships }] = await Promise.all([
      supabase.from("study_groups").select("*, study_group_members(count)").order("created_at", { ascending: false }),
      supabase.from("study_group_members").select("group_id").eq("user_id", user.id),
    ]);

    const myGroupIds = new Set((memberships || []).map((m: any) => m.group_id));
    const enriched = (allGroups || []).map((g: any) => ({
      ...g,
      member_count: g.study_group_members?.[0]?.count || 0,
      isMember: myGroupIds.has(g.id),
    }));

    setMyGroups(enriched.filter((g: any) => g.isMember));
    setGroups(enriched.filter((g: any) => !g.isMember));
    setLoading(false);
  };

  useEffect(() => { fetchGroups(); }, [user]);

  const handleCreate = async () => {
    if (!user || !form.name.trim()) return;
    setCreating(true);
    const { error } = await supabase.from("study_groups").insert({
      name: form.name.trim(),
      description: form.description.trim(),
      subject: form.subject.trim(),
      max_members: form.max_members,
      creator_id: user.id,
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Study group created!");
      setShowCreate(false);
      setForm({ name: "", description: "", subject: "", max_members: 10 });
      fetchGroups();
    }
    setCreating(false);
  };

  const handleJoinByCode = async () => {
    if (!user || !inviteCode.trim()) return;
    const { data: group } = await supabase.from("study_groups").select("id").eq("invite_code", inviteCode.trim()).maybeSingle();
    if (!group) { toast.error("Invalid invite code"); return; }
    const { error } = await supabase.from("study_group_members").insert({ group_id: group.id, user_id: user.id });
    if (error) toast.error(error.message.includes("duplicate") ? "Already a member" : error.message);
    else {
      toast.success("Joined group!");
      setShowJoin(false);
      setInviteCode("");
      fetchGroups();
    }
  };

  const handleJoin = async (groupId: string) => {
    if (!user) return;
    const { error } = await supabase.from("study_group_members").insert({ group_id: groupId, user_id: user.id });
    if (error) toast.error(error.message);
    else { toast.success("Joined!"); fetchGroups(); }
  };

  const displayGroups = tab === "my" ? myGroups : groups;
  const filtered = searchQuery.trim()
    ? displayGroups.filter((g: any) => {
        const q = searchQuery.toLowerCase();
        return g.name?.toLowerCase().includes(q) || g.subject?.toLowerCase().includes(q) || g.description?.toLowerCase().includes(q);
      })
    : displayGroups;

  return (
    <Layout>
      <div className="container py-6 max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-foreground">Study Groups</h1>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowJoin(true)}>
              <Copy className="h-4 w-4 mr-1" /> Join by Code
            </Button>
            <Button size="sm" className="gradient-primary" onClick={() => setShowCreate(true)}>
              <Plus className="h-4 w-4 mr-1" /> Create Group
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          {(["my", "discover"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === t ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {t === "my" ? "My Groups" : "Discover"}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search groups by name or subject..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Groups List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">{tab === "my" ? "You haven't joined any study groups yet" : "No groups found"}</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {filtered.map((g: any) => (
              <div
                key={g.id}
                className="bg-card border rounded-xl p-5 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => navigate(`/study-group/${g.id}`)}
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-foreground text-lg">{g.name}</h3>
                  {g.subject && (
                    <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">{g.subject}</span>
                  )}
                </div>
                {g.description && <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{g.description}</p>}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" /> {g.member_count}/{g.max_members} members
                  </span>
                  {!g.isMember && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => { e.stopPropagation(); handleJoin(g.id); }}
                    >
                      Join
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Study Group</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Input placeholder="Group name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input placeholder="Subject (e.g., Data Structures)" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
            <Textarea placeholder="Description (optional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <Input type="number" placeholder="Max members" value={form.max_members} onChange={(e) => setForm({ ...form, max_members: parseInt(e.target.value) || 10 })} min={2} max={50} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={creating || !form.name.trim()} className="gradient-primary">
              {creating ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Join by Code Dialog */}
      <Dialog open={showJoin} onOpenChange={setShowJoin}>
        <DialogContent>
          <DialogHeader><DialogTitle>Join by Invite Code</DialogTitle></DialogHeader>
          <Input placeholder="Enter invite code" value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowJoin(false)}>Cancel</Button>
            <Button onClick={handleJoinByCode} disabled={!inviteCode.trim()} className="gradient-primary">Join</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default StudyGroupsPage;
