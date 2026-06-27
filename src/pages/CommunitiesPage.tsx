import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import TabBar from "@/components/TabBar";
import { MessageSquare, Calendar, Users, Code, Lightbulb, BookOpen, Palette, GraduationCap, Plus, LogOut, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";

const iconMap: Record<string, any> = { Code, Lightbulb, Palette, BookOpen, GraduationCap };
const iconOptions = ["Code", "Lightbulb", "Palette", "BookOpen", "GraduationCap"];
const categoryOptions = ["Tech", "Entrepreneurship", "Creative", "Academic", "Leadership", "General"];

const categoryColors: Record<string, string> = {
  Tech: "bg-primary text-primary-foreground",
  Entrepreneurship: "bg-primary text-primary-foreground",
  Creative: "bg-primary text-primary-foreground",
  Academic: "bg-accent text-accent-foreground",
  Leadership: "bg-accent text-accent-foreground",
  General: "bg-muted text-muted-foreground",
};

const tabs = ["All", "My Communities", "Tech", "Creative", "Academic"];

const CommunitiesPage = () => {
  const [tab, setTab] = useState("All");
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newCategory, setNewCategory] = useState("General");
  const [newIcon, setNewIcon] = useState("Code");
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Fetch all communities with member count
  const { data: communities = [], isLoading } = useQuery({
    queryKey: ["communities"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("communities")
        .select("*, community_members(user_id)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data.map((c: any) => ({
        ...c,
        members: c.community_members?.length || 0,
        memberIds: c.community_members?.map((m: any) => m.user_id) || [],
      }));
    },
  });

  // Create community
  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("communities").insert({
        name: newName.trim(),
        description: newDesc.trim(),
        category: newCategory,
        icon: newIcon,
        creator_id: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["communities"] });
      setCreateOpen(false);
      setNewName("");
      setNewDesc("");
      setNewCategory("General");
      setNewIcon("Code");
      toast({ title: "Community created!" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // Join community
  const joinMutation = useMutation({
    mutationFn: async (communityId: string) => {
      const { error } = await supabase.from("community_members").insert({
        community_id: communityId,
        user_id: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["communities"] });
      toast({ title: "Joined community!" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // Leave community
  const leaveMutation = useMutation({
    mutationFn: async (communityId: string) => {
      const { error } = await supabase
        .from("community_members")
        .delete()
        .eq("community_id", communityId)
        .eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["communities"] });
      toast({ title: "Left community" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const isMember = (c: any) => c.memberIds?.includes(user?.id);
  const isCreator = (c: any) => c.creator_id === user?.id;

  const filtered =
    tab === "All"
      ? communities
      : tab === "My Communities"
      ? communities.filter((c: any) => isMember(c))
      : communities.filter((c: any) => c.category === tab);

  const IconComp = (name: string) => iconMap[name] || Code;

  return (
    <Layout>
      <div className="container py-8">
        <TabBar tabs={tabs} active={tab} onChange={setTab} />

        {/* Create Community Button */}
        <div className="mt-6 mb-4">
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-primary text-primary-foreground gap-2">
                <Plus className="h-4 w-4" /> Create New Community
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create a Community</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div>
                  <label className="text-sm font-medium text-foreground">Name</label>
                  <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. AI Enthusiasts" />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Description</label>
                  <Textarea value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="What is this community about?" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-foreground">Category</label>
                    <Select value={newCategory} onValueChange={setNewCategory}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {categoryOptions.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground">Icon</label>
                    <Select value={newIcon} onValueChange={setNewIcon}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {iconOptions.map((ic) => {
                          const IC = iconMap[ic];
                          return (
                            <SelectItem key={ic} value={ic}>
                              <span className="flex items-center gap-2"><IC className="h-4 w-4" /> {ic}</span>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button
                  className="w-full"
                  disabled={!newName.trim() || createMutation.isPending}
                  onClick={() => createMutation.mutate()}
                >
                  {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Community"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            {tab === "My Communities" ? "You haven't joined any communities yet." : "No communities found."}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((c: any) => {
              const IC = IconComp(c.icon);
              const joined = isMember(c);
              const creator = isCreator(c);
              return (
                <div key={c.id} className="bg-card rounded-xl border p-6 flex flex-col cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/community/${c.id}`)}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <IC className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-bold text-foreground">{c.name}</h3>
                        <p className="text-xs text-muted-foreground">{c.members} member{c.members !== 1 ? "s" : ""}</p>
                      </div>
                    </div>
                    <span className={`text-xs px-3 py-1 rounded-full font-medium ${categoryColors[c.category] || categoryColors.General}`}>
                      {c.category}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4 flex-1">{c.description}</p>
                  {creator && (
                    <p className="text-xs text-primary font-medium mb-2">✨ You created this</p>
                  )}
                  <div className="flex gap-2 mt-auto">
                    {joined ? (
                      <>
                        <Button variant="outline" size="sm" className="gap-1.5">
                          <MessageSquare className="h-3.5 w-3.5" /> Chat
                        </Button>
                        {!creator && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1.5 ml-auto text-destructive hover:text-destructive"
                            onClick={() => leaveMutation.mutate(c.id)}
                            disabled={leaveMutation.isPending}
                          >
                            <LogOut className="h-3.5 w-3.5" /> Leave
                          </Button>
                        )}
                      </>
                    ) : (
                      <Button
                        size="sm"
                        className="gradient-primary text-primary-foreground gap-1.5 ml-auto"
                        onClick={() => joinMutation.mutate(c.id)}
                        disabled={joinMutation.isPending}
                      >
                        <Users className="h-4 w-4" /> Join
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default CommunitiesPage;
