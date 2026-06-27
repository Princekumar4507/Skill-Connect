import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import TabBar from "@/components/TabBar";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import {
  Code, Lightbulb, Calendar, Filter, MessageSquare, Share2,
  Users, Loader2, Send, X, ImagePlus, Bookmark, Pencil, BarChart3, Check,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { PostSkeletonList } from "@/components/feed/PostSkeleton";
import ReactionPicker from "@/components/feed/ReactionPicker";
import SharePopover from "@/components/feed/SharePopover";
import PollComposer from "@/components/feed/PollComposer";
import PollDisplay from "@/components/feed/PollDisplay";
import MentionInput from "@/components/feed/MentionInput";

interface PostProfile {
  full_name: string;
  college: string | null;
  avatar_url: string | null;
  user_id: string;
}

interface Post {
  id: string;
  author_id: string;
  type: string;
  title: string;
  content: string;
  tags: string[];
  image_url: string | null;
  created_at: string;
  profile?: PostProfile;
  reactions: Record<string, number>;
  userReactions: string[];
  commentCount: number;
  bookmarked: boolean;
}

interface Comment {
  id: string;
  author_id: string;
  content: string;
  created_at: string;
  profile?: { full_name: string; user_id: string };
}

const feedTabs = ["All", "Projects", "Questions", "Events", "Polls"];
const typeMap: Record<string, string> = { Projects: "project", Questions: "question", Events: "event", Polls: "poll" };
const typeColors: Record<string, string> = {
  project: "bg-primary text-primary-foreground",
  question: "bg-accent text-accent-foreground",
  event: "bg-primary text-primary-foreground",
  poll: "bg-secondary text-secondary-foreground",
};
const typeLabels: Record<string, string> = { project: "Project", question: "Question", event: "Event", poll: "Poll" };

const HomePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [feedTab, setFeedTab] = useState("All");
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<PostProfile | null>(null);
  const [connectionCount, setConnectionCount] = useState(0);

  // Composer
  const [composerType, setComposerType] = useState<string>("project");
  const [composerTitle, setComposerTitle] = useState("");
  const [composerContent, setComposerContent] = useState("");
  const [composerTags, setComposerTags] = useState("");
  const [composerImage, setComposerImage] = useState<File | null>(null);
  const [composerImagePreview, setComposerImagePreview] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pollOptions, setPollOptions] = useState<string[]>(["", ""]);
  const [mentionedUsers, setMentionedUsers] = useState<{ user_id: string; full_name: string }[]>([]);

  // Edit
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editTags, setEditTags] = useState("");

  // Comments
  const [openComments, setOpenComments] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMorePosts, setHasMorePosts] = useState(true);

  // Infinite scroll
  const sentinelRef = useRef<HTMLDivElement>(null);

  const profileCacheRef = useRef<Record<string, PostProfile>>({});
  const POSTS_PAGE_SIZE = 10;

  const enrichPostBatch = (postsData: any[], profilesData: any[], reactionsData: any[], userReactionsData: any[], commentsData: any[], bookmarksData: any[]) => {
    const profileMap: Record<string, PostProfile> = {};
    (profilesData || []).forEach((p: any) => { profileMap[p.user_id] = p; profileCacheRef.current[p.user_id] = p; });

    // Reactions grouped by post_id and reaction_type
    const reactionMap: Record<string, Record<string, number>> = {};
    (reactionsData || []).forEach((r: any) => {
      if (!reactionMap[r.post_id]) reactionMap[r.post_id] = {};
      reactionMap[r.post_id][r.reaction_type] = (reactionMap[r.post_id][r.reaction_type] || 0) + 1;
    });

    const userReactionMap: Record<string, string[]> = {};
    (userReactionsData || []).forEach((r: any) => {
      if (!userReactionMap[r.post_id]) userReactionMap[r.post_id] = [];
      userReactionMap[r.post_id].push(r.reaction_type);
    });

    const commentCountMap: Record<string, number> = {};
    (commentsData || []).forEach((c: any) => { commentCountMap[c.post_id] = (commentCountMap[c.post_id] || 0) + 1; });

    const bookmarkSet = new Set((bookmarksData || []).map((b: any) => b.post_id));

    return postsData.map((p: any) => ({
      ...p,
      tags: p.tags || [],
      image_url: p.image_url || null,
      profile: profileMap[p.author_id],
      reactions: reactionMap[p.id] || {},
      userReactions: userReactionMap[p.id] || [],
      commentCount: commentCountMap[p.id] || 0,
      bookmarked: bookmarkSet.has(p.id),
    }));
  };

  const fetchPosts = async (append = false, cursor?: string) => {
    if (!user) return;
    if (append) setLoadingMore(true); else setLoading(true);

    let query = supabase
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(POSTS_PAGE_SIZE);

    if (cursor) query = query.lt("created_at", cursor);

    const { data: postsData } = await query;

    if (!postsData || postsData.length === 0) {
      setHasMorePosts(false);
      setLoading(false);
      setLoadingMore(false);
      return;
    }

    if (postsData.length < POSTS_PAGE_SIZE) setHasMorePosts(false);

    const authorIds = [...new Set(postsData.map((p: any) => p.author_id))];
    const postIds = postsData.map((p: any) => p.id);

    const [{ data: profiles }, { data: reactions }, { data: userReactions }, { data: commentCounts }, { data: bookmarks }] = await Promise.all([
      supabase.from("profiles").select("user_id, full_name, college, avatar_url").in("user_id", authorIds),
      supabase.from("post_reactions").select("post_id, reaction_type").in("post_id", postIds),
      supabase.from("post_reactions").select("post_id, reaction_type").eq("user_id", user.id).in("post_id", postIds),
      supabase.from("post_comments").select("post_id").in("post_id", postIds),
      supabase.from("post_bookmarks").select("post_id").eq("user_id", user.id).in("post_id", postIds),
    ]);

    const enriched = enrichPostBatch(postsData, profiles || [], reactions || [], userReactions || [], commentCounts || [], bookmarks || []);

    if (append) {
      setPosts((prev) => [...prev, ...enriched]);
    } else {
      setPosts(enriched);
    }
    setLoading(false);
    setLoadingMore(false);
  };

  // Infinite scroll observer
  useEffect(() => {
    if (!sentinelRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMorePosts && !loadingMore && !loading) {
          if (posts.length > 0) {
            const lastPost = posts[posts.length - 1];
            fetchPosts(true, lastPost.created_at);
          }
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMorePosts, loadingMore, loading, posts]);

  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      const [{ data: prof }, { data: conns }] = await Promise.all([
        supabase.from("profiles").select("user_id, full_name, college, avatar_url").eq("user_id", user.id).maybeSingle(),
        supabase.from("connections").select("id").or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`).eq("status", "accepted"),
      ]);
      if (prof) setProfile(prof);
      setConnectionCount(conns?.length || 0);
    };
    fetchProfile();
    fetchPosts();
  }, [user]);

  // Realtime subscription
  useEffect(() => {
    if (!user) return;
    const enrichPost = async (rawPost: any): Promise<Post> => {
      let postProfile = profileCacheRef.current[rawPost.author_id];
      if (!postProfile) {
        const { data } = await supabase.from("profiles").select("user_id, full_name, college, avatar_url").eq("user_id", rawPost.author_id).maybeSingle();
        if (data) { profileCacheRef.current[data.user_id] = data; postProfile = data; }
      }
      return { ...rawPost, tags: rawPost.tags || [], image_url: rawPost.image_url || null, profile: postProfile, reactions: {}, userReactions: [], commentCount: 0, bookmarked: false };
    };

    const channel = supabase
      .channel("posts-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "posts" }, async (payload) => {
        const newPost = await enrichPost(payload.new);
        setPosts((prev) => [newPost, ...prev]);
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "posts" }, (payload) => {
        setPosts((prev) => prev.filter((p) => p.id !== (payload.old as any).id));
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "posts" }, (payload) => {
        const updated = payload.new as any;
        setPosts((prev) => prev.map((p) => p.id === updated.id ? { ...p, ...updated, tags: updated.tags || [] } : p));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast({ title: "File too large", description: "Max 5MB", variant: "destructive" }); return; }
    setComposerImage(file);
    setComposerImagePreview(URL.createObjectURL(file));
  };

  const clearImage = () => {
    setComposerImage(null);
    if (composerImagePreview) URL.revokeObjectURL(composerImagePreview);
    setComposerImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handlePost = async () => {
    if (!user || !composerTitle.trim() || !composerContent.trim()) return;
    if (composerType === "poll" && pollOptions.filter((o) => o.trim()).length < 2) {
      toast({ title: "Add at least 2 poll options", variant: "destructive" });
      return;
    }
    setPosting(true);

    let imageUrl: string | null = null;
    if (composerImage) {
      const ext = composerImage.name.split(".").pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("post-images").upload(path, composerImage);
      if (uploadError) { toast({ title: "Upload failed", description: uploadError.message, variant: "destructive" }); setPosting(false); return; }
      const { data: urlData } = supabase.storage.from("post-images").getPublicUrl(path);
      imageUrl = urlData.publicUrl;
    }

    const tags = composerTags.split(",").map((t) => t.trim()).filter(Boolean);
    const { data: postData, error } = await supabase.from("posts").insert({
      author_id: user.id,
      type: composerType,
      title: composerTitle.trim(),
      content: composerContent.trim(),
      tags,
      image_url: imageUrl,
    }).select().single();

    if (error) { console.error("Post creation error:", error); toast({ title: "Error", description: error.message || "Could not create post.", variant: "destructive" }); setPosting(false); return; }
    else {
      // Create poll if type is poll
      if (composerType === "poll" && postData) {
        const { data: pollData } = await supabase.from("polls").insert({ post_id: postData.id }).select().single();
        if (pollData) {
          const opts = pollOptions.filter((o) => o.trim()).map((o) => ({ poll_id: pollData.id, option_text: o.trim() }));
          await supabase.from("poll_options").insert(opts);
        }
      }

      // Create mentions
      if (mentionedUsers.length > 0 && postData) {
        const mentions = mentionedUsers.map((m) => ({ post_id: postData.id, mentioned_user_id: m.user_id }));
        await supabase.from("post_mentions").insert(mentions);
      }

      toast({ title: "Post created!" });
      setComposerTitle("");
      setComposerContent("");
      setComposerTags("");
      clearImage();
      setPollOptions(["", ""]);
      setMentionedUsers([]);
    }
    setPosting(false);
  };

  const toggleReaction = async (postId: string, reactionType: string) => {
    if (!user) return;
    const post = posts.find((p) => p.id === postId);
    if (!post) return;

    const hasReaction = post.userReactions.includes(reactionType);

    // Optimistic update
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;
        const newReactions = { ...p.reactions };
        let newUserReactions = [...p.userReactions];
        if (hasReaction) {
          newReactions[reactionType] = Math.max(0, (newReactions[reactionType] || 1) - 1);
          if (newReactions[reactionType] === 0) delete newReactions[reactionType];
          newUserReactions = newUserReactions.filter((r) => r !== reactionType);
        } else {
          newReactions[reactionType] = (newReactions[reactionType] || 0) + 1;
          newUserReactions.push(reactionType);
        }
        return { ...p, reactions: newReactions, userReactions: newUserReactions };
      })
    );

    if (hasReaction) {
      await supabase.from("post_reactions").delete().eq("post_id", postId).eq("user_id", user.id).eq("reaction_type", reactionType);
    } else {
      await supabase.from("post_reactions").insert({ post_id: postId, user_id: user.id, reaction_type: reactionType });
    }
  };

  const toggleBookmark = async (postId: string) => {
    if (!user) return;
    const post = posts.find((p) => p.id === postId);
    if (!post) return;

    setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, bookmarked: !p.bookmarked } : p));

    if (post.bookmarked) {
      await supabase.from("post_bookmarks").delete().eq("post_id", postId).eq("user_id", user.id);
    } else {
      await supabase.from("post_bookmarks").insert({ post_id: postId, user_id: user.id });
    }
  };

  const startEdit = (post: Post) => {
    setEditingPostId(post.id);
    setEditTitle(post.title);
    setEditContent(post.content);
    setEditTags(post.tags.join(", "));
  };

  const saveEdit = async () => {
    if (!editingPostId || !editTitle.trim() || !editContent.trim()) return;
    const tags = editTags.split(",").map((t) => t.trim()).filter(Boolean);
    await supabase.from("posts").update({ title: editTitle.trim(), content: editContent.trim(), tags }).eq("id", editingPostId);
    setPosts((prev) => prev.map((p) => p.id === editingPostId ? { ...p, title: editTitle.trim(), content: editContent.trim(), tags } : p));
    setEditingPostId(null);
    toast({ title: "Post updated!" });
  };

  const loadComments = async (postId: string) => {
    if (openComments === postId) { setOpenComments(null); return; }
    setOpenComments(postId);
    setLoadingComments(true);
    const { data } = await supabase.from("post_comments").select("*").eq("post_id", postId).order("created_at", { ascending: true });
    const authorIds = [...new Set((data || []).map((c: any) => c.author_id))];
    const { data: profiles } = authorIds.length
      ? await supabase.from("profiles").select("user_id, full_name").in("user_id", authorIds)
      : { data: [] };
    const profileMap: Record<string, { full_name: string; user_id: string }> = {};
    (profiles || []).forEach((p: any) => { profileMap[p.user_id] = p; });
    setComments((data || []).map((c: any) => ({ ...c, profile: profileMap[c.author_id] })));
    setLoadingComments(false);
  };

  const submitComment = async (postId: string) => {
    if (!user || !newComment.trim()) return;
    const { error } = await supabase.from("post_comments").insert({ post_id: postId, author_id: user.id, content: newComment.trim() });
    if (!error) {
      setNewComment("");
      loadComments(postId);
      setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, commentCount: p.commentCount + 1 } : p));
    }
  };

  const getInitials = (name: string) => name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  const filteredPosts = posts.filter((p) => feedTab === "All" || p.type === typeMap[feedTab]);

  return (
    <Layout>
      <div className="container py-4 md:py-8 px-4">
        <div className="grid lg:grid-cols-[320px_1fr] gap-6 md:gap-8">
          {/* Sidebar */}
          <div className="space-y-6">
            <div className="bg-card rounded-xl border p-6 text-center">
              <Avatar className="h-16 w-16 mx-auto mb-3">
                {profile?.avatar_url && <AvatarImage src={profile.avatar_url} alt={profile.full_name} className="object-cover" />}
                <AvatarFallback className="gradient-primary text-primary-foreground text-lg">
                  {profile ? getInitials(profile.full_name) : "?"}
                </AvatarFallback>
              </Avatar>
              <h2 className="text-lg font-bold text-foreground">{profile?.full_name || "Your Name"}</h2>
              <p className="text-sm text-muted-foreground">{profile?.college || "Set your college"}</p>
              <div className="flex justify-center gap-8 mt-4 mb-4">
                <div className="text-center">
                  <p className="text-xl font-bold text-foreground">{connectionCount}</p>
                  <p className="text-xs text-muted-foreground">Connections</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold text-foreground">{posts.filter((p) => p.author_id === user?.id).length}</p>
                  <p className="text-xs text-muted-foreground">Posts</p>
                </div>
              </div>
              <button onClick={() => navigate("/profile")} className="w-full border rounded-lg py-2 text-sm font-medium text-foreground hover:bg-secondary transition-colors">
                View Profile
              </button>
            </div>
            <div className="bg-card rounded-xl border p-6">
              <h3 className="font-bold text-foreground mb-4">Discover</h3>
              <div className="space-y-3">
                {[
                  { icon: Calendar, label: "Upcoming Events", path: "/events" },
                  { icon: Users, label: "Communities", path: "/communities" },
                  { icon: Users, label: "Find Students", path: "/discover" },
                  { icon: Code, label: "Connections", path: "/connections" },
                  { icon: Bookmark, label: "Saved Posts", path: "/saved-posts" },
                ].map(({ icon: Icon, label, path }) => (
                  <button key={label} onClick={() => navigate(path)} className="flex items-center gap-3 w-full text-sm text-muted-foreground hover:text-foreground transition-colors">
                    <Icon className="h-4 w-4" /> {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Feed */}
          <div className="space-y-6">
            {/* Composer */}
            <div className="bg-card rounded-xl border p-4 space-y-3">
              <div className="flex gap-2 flex-wrap">
                {(["project", "question", "event", "poll"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setComposerType(t)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-colors ${
                      composerType === t ? "bg-primary text-primary-foreground border-primary" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {t === "project" && <Code className="h-3.5 w-3.5" />}
                    {t === "question" && <Lightbulb className="h-3.5 w-3.5" />}
                    {t === "event" && <Calendar className="h-3.5 w-3.5" />}
                    {t === "poll" && <BarChart3 className="h-3.5 w-3.5" />}
                    {typeLabels[t]}
                  </button>
                ))}
              </div>
              <Input placeholder="Title..." value={composerTitle} onChange={(e) => setComposerTitle(e.target.value)} className="bg-secondary/50 border-0" />
              <MentionInput
                value={composerContent}
                onChange={setComposerContent}
                placeholder="Share a project, ask a question, or post an update... Use @name to mention someone"
                mentionedUsers={mentionedUsers}
                onMentionsChange={setMentionedUsers}
              />

              {composerType === "poll" && (
                <PollComposer options={pollOptions} onChange={setPollOptions} />
              )}

              {composerImagePreview && (
                <div className="relative inline-block">
                  <img src={composerImagePreview} alt="Preview" className="max-h-48 rounded-lg border object-cover" />
                  <button onClick={clearImage} className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 shadow-md hover:opacity-80">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Input placeholder="Tags (comma separated)..." value={composerTags} onChange={(e) => setComposerTags(e.target.value)} className="bg-secondary/50 border-0 max-w-[200px] text-xs" />
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
                  <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={() => fileInputRef.current?.click()}>
                    <ImagePlus className="h-4 w-4" />
                  </Button>
                </div>
                <Button onClick={handlePost} disabled={posting || !composerTitle.trim() || !composerContent.trim()} className="gradient-primary" size="sm">
                  {posting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                  Post
                </Button>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-3">
              <div className="flex-1"><TabBar tabs={feedTabs} active={feedTab} onChange={setFeedTab} /></div>
              <button className="p-2 border rounded-lg hover:bg-secondary transition-colors"><Filter className="h-4 w-4 text-muted-foreground" /></button>
            </div>

            {/* Posts */}
            {loading ? (
              <PostSkeletonList count={3} />
            ) : filteredPosts.length === 0 ? (
              <div className="text-center py-16 bg-card rounded-xl border">
                <MessageSquare className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground font-medium">No posts yet</p>
                <p className="text-muted-foreground/60 text-sm mt-1">Be the first to share something!</p>
              </div>
            ) : (
              filteredPosts.map((post) => (
                <div key={post.id} className="bg-card rounded-xl border p-6 animate-fade-in">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 cursor-pointer" onClick={() => navigate(`/user/${post.author_id}`)}>
                        {post.profile?.avatar_url && <AvatarImage src={post.profile.avatar_url} alt={post.profile.full_name} className="object-cover" />}
                        <AvatarFallback className="bg-muted text-muted-foreground text-sm">
                          {post.profile ? getInitials(post.profile.full_name) : "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => navigate(`/user/${post.author_id}`)} className="font-semibold text-foreground text-sm hover:text-primary transition-colors">
                            {post.profile?.full_name || "Unknown"}
                          </button>
                          {post.profile?.college && <span className="text-xs border rounded-full px-2 py-0.5 text-muted-foreground">{post.profile.college}</span>}
                        </div>
                        <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-3 py-1 rounded-full font-medium ${typeColors[post.type]}`}>{typeLabels[post.type] || post.type}</span>
                      <button onClick={() => toggleBookmark(post.id)} className={`transition-colors ${post.bookmarked ? "text-primary" : "text-muted-foreground hover:text-primary"}`}>
                        <Bookmark className={`h-4 w-4 ${post.bookmarked ? "fill-current" : ""}`} />
                      </button>
                    </div>
                  </div>

                  {editingPostId === post.id ? (
                    <div className="space-y-2 mb-4">
                      <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="bg-secondary/50 border font-bold" />
                      <textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} rows={3} className="w-full bg-secondary/50 rounded-md border px-3 py-2 text-sm outline-none resize-none" />
                      <Input value={editTags} onChange={(e) => setEditTags(e.target.value)} placeholder="Tags (comma separated)" className="bg-secondary/50 border text-xs" />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={saveEdit} className="gradient-primary"><Check className="h-3.5 w-3.5 mr-1" /> Save</Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingPostId(null)}>Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <h3 className="font-bold text-foreground mb-2 cursor-pointer hover:text-primary transition-colors" onClick={() => navigate(`/post/${post.id}`)}>{post.title}</h3>
                      <p className="text-sm text-muted-foreground mb-4 whitespace-pre-line cursor-pointer" onClick={() => navigate(`/post/${post.id}`)}>{post.content}</p>
                    </>
                  )}

                  {post.image_url && (
                    <div className="mb-4 rounded-lg overflow-hidden border">
                      <img src={post.image_url} alt="Post image" className="w-full max-h-96 object-cover" loading="lazy" />
                    </div>
                  )}

                  {post.type === "poll" && <PollDisplay postId={post.id} />}

                  {post.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {post.tags.map((tag) => (
                        <span key={tag} className="text-xs px-3 py-1 rounded-full bg-accent/20 text-accent font-medium">{tag}</span>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-6 pt-3 border-t">
                    <ReactionPicker
                      postId={post.id}
                      reactions={post.reactions}
                      userReactions={post.userReactions}
                      onToggle={(type) => toggleReaction(post.id, type)}
                    />
                    <button onClick={() => loadComments(post.id)} className={`flex items-center gap-1.5 text-sm transition-colors ${openComments === post.id ? "text-primary" : "text-muted-foreground hover:text-primary"}`}>
                      <MessageSquare className="h-4 w-4" /> {post.commentCount}
                    </button>
                    <SharePopover postId={post.id} postTitle={post.title} />
                    {post.author_id === user?.id && (
                      <div className="ml-auto flex items-center gap-2">
                        <button onClick={() => startEdit(post)} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={async () => {
                            await supabase.from("posts").delete().eq("id", post.id);
                            toast({ title: "Post deleted" });
                          }}
                          className="text-sm text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {openComments === post.id && (
                    <div className="mt-4 pt-4 border-t space-y-3">
                      {loadingComments ? (
                        <div className="text-center py-2"><Loader2 className="h-5 w-5 animate-spin text-primary mx-auto" /></div>
                      ) : comments.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center">No comments yet</p>
                      ) : (
                        comments.map((c) => (
                          <div key={c.id} className="flex gap-2">
                            <Avatar className="h-7 w-7 shrink-0">
                              <AvatarFallback className="bg-muted text-muted-foreground text-[10px]">
                                {c.profile ? getInitials(c.profile.full_name) : "?"}
                              </AvatarFallback>
                            </Avatar>
                            <div className="bg-secondary/50 rounded-lg px-3 py-2 flex-1">
                              <button onClick={() => navigate(`/user/${c.author_id}`)} className="text-xs font-semibold text-foreground hover:text-primary transition-colors">
                                {c.profile?.full_name || "Unknown"}
                              </button>
                              <p className="text-sm text-foreground">{c.content}</p>
                            </div>
                          </div>
                        ))
                      )}
                      <form onSubmit={(e) => { e.preventDefault(); submitComment(post.id); }} className="flex gap-2">
                        <Input placeholder="Write a comment..." value={newComment} onChange={(e) => setNewComment(e.target.value)} className="flex-1 bg-secondary/50 border-0 text-sm h-9" />
                        <Button type="submit" size="icon" className="h-9 w-9 gradient-primary shrink-0" disabled={!newComment.trim()}>
                          <Send className="h-3.5 w-3.5" />
                        </Button>
                      </form>
                    </div>
                  )}
                </div>
              ))
            )}

            {/* Infinite scroll sentinel */}
            {!loading && hasMorePosts && (
              <div ref={sentinelRef} className="flex justify-center py-4">
                {loadingMore && <Loader2 className="h-6 w-6 animate-spin text-primary" />}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default HomePage;
