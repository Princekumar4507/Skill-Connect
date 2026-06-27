import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import {
  MessageSquare, Send, Loader2, ArrowLeft, X, Bookmark, Pencil, Check,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import ReactionPicker from "@/components/feed/ReactionPicker";
import SharePopover from "@/components/feed/SharePopover";
import PollDisplay from "@/components/feed/PollDisplay";

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
  profile?: { full_name: string; avatar_url: string | null; user_id: string };
}

const typeColors: Record<string, string> = {
  project: "bg-primary text-primary-foreground",
  question: "bg-accent text-accent-foreground",
  event: "bg-primary text-primary-foreground",
  poll: "bg-secondary text-secondary-foreground",
};
const typeLabels: Record<string, string> = { project: "Project", question: "Question", event: "Event", poll: "Poll" };

const getInitials = (name: string) => name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

const PostDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingComments, setLoadingComments] = useState(true);

  // Edit state
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editTags, setEditTags] = useState("");

  useEffect(() => {
    if (!id || !user) return;

    const fetchPost = async () => {
      const { data: postData } = await supabase.from("posts").select("*").eq("id", id).maybeSingle();
      if (!postData) { setLoading(false); return; }

      const [{ data: profile }, { data: reactions }, { data: userReactions }, { data: commentData }, { data: bookmark }] = await Promise.all([
        supabase.from("profiles").select("user_id, full_name, college, avatar_url").eq("user_id", postData.author_id).maybeSingle(),
        supabase.from("post_reactions").select("post_id, reaction_type").eq("post_id", id),
        supabase.from("post_reactions").select("post_id, reaction_type").eq("post_id", id).eq("user_id", user.id),
        supabase.from("post_comments").select("id").eq("post_id", id),
        supabase.from("post_bookmarks").select("id").eq("post_id", id).eq("user_id", user.id).maybeSingle(),
      ]);

      const reactionMap: Record<string, number> = {};
      (reactions || []).forEach((r: any) => { reactionMap[r.reaction_type] = (reactionMap[r.reaction_type] || 0) + 1; });

      setPost({
        ...postData,
        tags: postData.tags || [],
        image_url: postData.image_url || null,
        profile: profile || undefined,
        reactions: reactionMap,
        userReactions: (userReactions || []).map((r: any) => r.reaction_type),
        commentCount: commentData?.length || 0,
        bookmarked: !!bookmark,
      });
      setLoading(false);
    };

    const fetchComments = async () => {
      const { data } = await supabase.from("post_comments").select("*").eq("post_id", id).order("created_at", { ascending: true });
      const authorIds = [...new Set((data || []).map((c: any) => c.author_id))];
      const { data: profiles } = authorIds.length
        ? await supabase.from("profiles").select("user_id, full_name, avatar_url").in("user_id", authorIds)
        : { data: [] };
      const profileMap: Record<string, { full_name: string; avatar_url: string | null; user_id: string }> = {};
      (profiles || []).forEach((p: any) => { profileMap[p.user_id] = p; });
      setComments((data || []).map((c: any) => ({ ...c, profile: profileMap[c.author_id] })));
      setLoadingComments(false);
    };

    fetchPost();
    fetchComments();

    const channel = supabase
      .channel(`post-comments-${id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "post_comments", filter: `post_id=eq.${id}` },
        async (payload) => {
          const newC = payload.new as any;
          const { data: prof } = await supabase.from("profiles").select("user_id, full_name, avatar_url").eq("user_id", newC.author_id).maybeSingle();
          const enriched: Comment = { ...newC, profile: prof || undefined };
          setComments((prev) => prev.some((c) => c.id === enriched.id) ? prev : [...prev, enriched]);
          setPost((p) => p ? { ...p, commentCount: p.commentCount + 1 } : p);
        }
      )
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "post_comments", filter: `post_id=eq.${id}` },
        (payload) => {
          setComments((prev) => prev.filter((c) => c.id !== (payload.old as any).id));
          setPost((p) => p ? { ...p, commentCount: Math.max(0, p.commentCount - 1) } : p);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [id, user]);

  const toggleReaction = async (reactionType: string) => {
    if (!user || !post) return;
    const hasReaction = post.userReactions.includes(reactionType);

    setPost((p) => {
      if (!p) return p;
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
    });

    if (hasReaction) {
      await supabase.from("post_reactions").delete().eq("post_id", post.id).eq("user_id", user.id).eq("reaction_type", reactionType);
    } else {
      await supabase.from("post_reactions").insert({ post_id: post.id, user_id: user.id, reaction_type: reactionType });
    }
  };

  const toggleBookmark = async () => {
    if (!user || !post) return;
    setPost((p) => p ? { ...p, bookmarked: !p.bookmarked } : p);
    if (post.bookmarked) {
      await supabase.from("post_bookmarks").delete().eq("post_id", post.id).eq("user_id", user.id);
    } else {
      await supabase.from("post_bookmarks").insert({ post_id: post.id, user_id: user.id });
    }
  };

  const startEdit = () => {
    if (!post) return;
    setEditing(true);
    setEditTitle(post.title);
    setEditContent(post.content);
    setEditTags(post.tags.join(", "));
  };

  const saveEdit = async () => {
    if (!post || !editTitle.trim() || !editContent.trim()) return;
    const tags = editTags.split(",").map((t) => t.trim()).filter(Boolean);
    await supabase.from("posts").update({ title: editTitle.trim(), content: editContent.trim(), tags }).eq("id", post.id);
    setPost((p) => p ? { ...p, title: editTitle.trim(), content: editContent.trim(), tags } : p);
    setEditing(false);
    toast({ title: "Post updated!" });
  };

  const submitComment = async () => {
    if (!user || !post || !newComment.trim()) return;
    const { error } = await supabase.from("post_comments").insert({ post_id: post.id, author_id: user.id, content: newComment.trim() });
    if (!error) setNewComment("");
  };

  const deletePost = async () => {
    if (!post) return;
    await supabase.from("posts").delete().eq("id", post.id);
    toast({ title: "Post deleted" });
    navigate("/home");
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!post) {
    return (
      <Layout>
        <div className="container py-16 text-center">
          <p className="text-muted-foreground text-lg">Post not found</p>
          <Button variant="outline" onClick={() => navigate("/home")} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Feed
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container max-w-2xl py-4 md:py-8 px-4">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        <div className="bg-card rounded-xl border p-6 animate-fade-in">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12 cursor-pointer" onClick={() => navigate(`/user/${post.author_id}`)}>
                {post.profile?.avatar_url && <AvatarImage src={post.profile.avatar_url} alt={post.profile.full_name} className="object-cover" />}
                <AvatarFallback className="bg-muted text-muted-foreground">
                  {post.profile ? getInitials(post.profile.full_name) : "?"}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-2">
                  <button onClick={() => navigate(`/user/${post.author_id}`)} className="font-semibold text-foreground hover:text-primary transition-colors">
                    {post.profile?.full_name || "Unknown"}
                  </button>
                  {post.profile?.college && <span className="text-xs border rounded-full px-2 py-0.5 text-muted-foreground">{post.profile.college}</span>}
                </div>
                <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs px-3 py-1 rounded-full font-medium ${typeColors[post.type]}`}>{typeLabels[post.type] || post.type}</span>
              <button onClick={toggleBookmark} className={`transition-colors ${post.bookmarked ? "text-primary" : "text-muted-foreground hover:text-primary"}`}>
                <Bookmark className={`h-4 w-4 ${post.bookmarked ? "fill-current" : ""}`} />
              </button>
            </div>
          </div>

          {editing ? (
            <div className="space-y-2 mb-4">
              <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="bg-secondary/50 border font-bold text-xl" />
              <textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} rows={4} className="w-full bg-secondary/50 rounded-md border px-3 py-2 text-sm outline-none resize-none" />
              <Input value={editTags} onChange={(e) => setEditTags(e.target.value)} placeholder="Tags (comma separated)" className="bg-secondary/50 border text-xs" />
              <div className="flex gap-2">
                <Button size="sm" onClick={saveEdit} className="gradient-primary"><Check className="h-3.5 w-3.5 mr-1" /> Save</Button>
                <Button size="sm" variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
              </div>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-bold text-foreground mb-3">{post.title}</h1>
              <p className="text-sm text-muted-foreground whitespace-pre-line mb-4 leading-relaxed">{post.content}</p>
            </>
          )}

          {post.image_url && (
            <div className="mb-4 rounded-lg overflow-hidden border">
              <img src={post.image_url} alt="Post image" className="w-full max-h-[500px] object-cover" loading="lazy" />
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

          <div className="flex items-center gap-6 pt-4 border-t">
            <ReactionPicker
              postId={post.id}
              reactions={post.reactions}
              userReactions={post.userReactions}
              onToggle={toggleReaction}
            />
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <MessageSquare className="h-4 w-4" /> {post.commentCount}
            </span>
            <SharePopover postId={post.id} postTitle={post.title} />
            {post.author_id === user?.id && (
              <div className="ml-auto flex items-center gap-2">
                <button onClick={startEdit} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  <Pencil className="h-4 w-4" />
                </button>
                <button onClick={deletePost} className="text-sm text-muted-foreground hover:text-destructive transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Comments section */}
        <div className="bg-card rounded-xl border p-6 mt-4">
          <h2 className="font-semibold text-foreground mb-4">Comments ({post.commentCount})</h2>

          {loadingComments ? (
            <div className="text-center py-4"><Loader2 className="h-5 w-5 animate-spin text-primary mx-auto" /></div>
          ) : comments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No comments yet. Be the first!</p>
          ) : (
            <div className="space-y-4 mb-4">
              {comments.map((c) => (
                <div key={c.id} className="flex gap-3">
                  <Avatar className="h-8 w-8 shrink-0 cursor-pointer" onClick={() => navigate(`/user/${c.author_id}`)}>
                    {c.profile?.avatar_url && <AvatarImage src={c.profile.avatar_url} className="object-cover" />}
                    <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                      {c.profile ? getInitials(c.profile.full_name) : "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="bg-secondary/50 rounded-lg px-4 py-3 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <button onClick={() => navigate(`/user/${c.author_id}`)} className="text-sm font-semibold text-foreground hover:text-primary transition-colors">
                        {c.profile?.full_name || "Unknown"}
                      </button>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-sm text-foreground">{c.content}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={(e) => { e.preventDefault(); submitComment(); }} className="flex gap-2 pt-3 border-t">
            <Input placeholder="Write a comment..." value={newComment} onChange={(e) => setNewComment(e.target.value)} className="flex-1 bg-secondary/50 border-0" />
            <Button type="submit" size="icon" className="gradient-primary shrink-0" disabled={!newComment.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>
    </Layout>
  );
};

export default PostDetailPage;
