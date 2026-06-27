import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "@/hooks/use-toast";
import {
  ArrowLeft, Users, Send, Loader2, Trash2, Code, Lightbulb, Palette, BookOpen, GraduationCap, Crown,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const iconMap: Record<string, any> = { Code, Lightbulb, Palette, BookOpen, GraduationCap };

const CommunityDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch community
  const { data: community, isLoading: loadingCommunity } = useQuery({
    queryKey: ["community", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("communities")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Fetch members with profiles
  const { data: members = [] } = useQuery({
    queryKey: ["community-members", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("community_members")
        .select("*, profiles!community_members_user_id_fkey(full_name, avatar_url, college)")
        .eq("community_id", id!);
      // If FK join fails, try manual join
      if (error) {
        const { data: membersData } = await supabase
          .from("community_members")
          .select("*")
          .eq("community_id", id!);
        if (!membersData) return [];
        const userIds = membersData.map((m: any) => m.user_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, avatar_url, college")
          .in("user_id", userIds);
        const profileMap = Object.fromEntries((profiles || []).map((p: any) => [p.user_id, p]));
        return membersData.map((m: any) => ({ ...m, profile: profileMap[m.user_id] || null }));
      }
      return data.map((m: any) => ({ ...m, profile: m.profiles }));
    },
    enabled: !!id,
  });

  // Fetch posts with author profiles
  const { data: posts = [], isLoading: loadingPosts } = useQuery({
    queryKey: ["community-posts", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("community_posts")
        .select("*")
        .eq("community_id", id!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      if (!data || data.length === 0) return [];
      const authorIds = [...new Set(data.map((p: any) => p.author_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .in("user_id", authorIds);
      const profileMap = Object.fromEntries((profiles || []).map((p: any) => [p.user_id, p]));
      return data.map((p: any) => ({ ...p, author: profileMap[p.author_id] || null }));
    },
    enabled: !!id,
  });

  // Realtime subscription for new posts
  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`community-posts-${id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "community_posts", filter: `community_id=eq.${id}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["community-posts", id] });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id, queryClient]);

  // Auto scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [posts]);

  // Send post
  const sendMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("community_posts").insert({
        community_id: id!,
        author_id: user!.id,
        content: message.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ["community-posts", id] });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // Delete post
  const deleteMutation = useMutation({
    mutationFn: async (postId: string) => {
      const { error } = await supabase.from("community_posts").delete().eq("id", postId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["community-posts", id] }),
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const isMember = members.some((m: any) => m.user_id === user?.id);
  const IC = iconMap[community?.icon || "Code"] || Code;

  if (loadingCommunity) {
    return (
      <Layout>
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!community) {
    return (
      <Layout>
        <div className="container py-16 text-center text-muted-foreground">
          Community not found.
          <Button variant="link" onClick={() => navigate("/communities")}>Go back</Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate("/communities")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <IC className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground">{community.name}</h1>
            <p className="text-sm text-muted-foreground">{community.description}</p>
          </div>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            {members.length} member{members.length !== 1 ? "s" : ""}
          </div>
        </div>

        <div className="grid lg:grid-cols-[1fr_280px] gap-6">
          {/* Discussion Area */}
          <div className="bg-card border rounded-xl flex flex-col" style={{ height: "calc(100vh - 220px)" }}>
            <div className="p-4 border-b">
              <h2 className="font-semibold text-foreground">Discussion</h2>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
              {loadingPosts ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : posts.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-sm">
                  No messages yet. Start the conversation! 🎉
                </div>
              ) : (
                posts.map((post: any) => {
                  const isOwn = post.author_id === user?.id;
                  return (
                    <div key={post.id} className={`flex gap-3 group ${isOwn ? "flex-row-reverse" : ""}`}>
                      <Avatar className="h-8 w-8 flex-shrink-0">
                        <AvatarImage src={post.author?.avatar_url || ""} />
                        <AvatarFallback className="text-xs bg-primary/10 text-primary">
                          {(post.author?.full_name || "?")[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className={`max-w-[70%] ${isOwn ? "items-end" : ""}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium text-foreground">
                            {post.author?.full_name || "Unknown"}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                          </span>
                          {isOwn && (
                            <button
                              onClick={() => deleteMutation.mutate(post.id)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                        <div className={`rounded-xl px-4 py-2.5 text-sm ${
                          isOwn
                            ? "bg-primary text-primary-foreground rounded-br-sm"
                            : "bg-muted text-foreground rounded-bl-sm"
                        }`}>
                          {post.content}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Input */}
            {isMember ? (
              <div className="p-4 border-t">
                <div className="flex gap-2">
                  <Textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="min-h-[44px] max-h-[120px] resize-none"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        if (message.trim()) sendMutation.mutate();
                      }
                    }}
                  />
                  <Button
                    size="icon"
                    disabled={!message.trim() || sendMutation.isPending}
                    onClick={() => sendMutation.mutate()}
                  >
                    {sendMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="p-4 border-t text-center text-sm text-muted-foreground">
                Join this community to participate in discussions.
              </div>
            )}
          </div>

          {/* Members Sidebar */}
          <div className="bg-card border rounded-xl p-4 h-fit max-h-[calc(100vh-220px)] overflow-y-auto">
            <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
              <Users className="h-4 w-4" /> Members
            </h3>
            <div className="space-y-3">
              {members.map((m: any) => (
                <div
                  key={m.id}
                  className="flex items-center gap-2.5 cursor-pointer hover:bg-muted/50 rounded-lg p-1.5 -mx-1.5 transition-colors"
                  onClick={() => navigate(`/user/${m.user_id}`)}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={m.profile?.avatar_url || ""} />
                    <AvatarFallback className="text-xs bg-primary/10 text-primary">
                      {(m.profile?.full_name || "?")[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate flex items-center gap-1">
                      {m.profile?.full_name || "Unknown"}
                      {m.role === "admin" && <Crown className="h-3 w-3 text-yellow-500" />}
                    </p>
                    {m.profile?.college && (
                      <p className="text-xs text-muted-foreground truncate">{m.profile.college}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default CommunityDetailPage;
