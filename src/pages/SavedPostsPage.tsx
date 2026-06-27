import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bookmark, ArrowLeft, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const SavedPostsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data: bookmarks } = await supabase
        .from("post_bookmarks")
        .select("post_id, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (!bookmarks || bookmarks.length === 0) { setLoading(false); return; }

      const postIds = bookmarks.map((b: any) => b.post_id);
      const { data: postsData } = await supabase.from("posts").select("*").in("id", postIds);
      if (!postsData) { setLoading(false); return; }

      const authorIds = [...new Set(postsData.map((p: any) => p.author_id))];
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name, avatar_url, college").in("user_id", authorIds);
      const profileMap: Record<string, any> = {};
      (profiles || []).forEach((p: any) => { profileMap[p.user_id] = p; });

      const enriched = postsData.map((p: any) => ({ ...p, profile: profileMap[p.author_id] }));
      // Sort by bookmark order
      const orderMap: Record<string, number> = {};
      bookmarks.forEach((b: any, i: number) => { orderMap[b.post_id] = i; });
      enriched.sort((a: any, b: any) => (orderMap[a.id] ?? 0) - (orderMap[b.id] ?? 0));

      setPosts(enriched);
      setLoading(false);
    };
    fetch();
  }, [user]);

  const getInitials = (name: string) => name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <Layout>
      <div className="container max-w-2xl py-4 md:py-8 px-4">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        <div className="flex items-center gap-2 mb-6">
          <Bookmark className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold text-foreground">Saved Posts</h1>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : posts.length === 0 ? (
          <div className="text-center py-16 bg-card rounded-xl border">
            <Bookmark className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground font-medium">No saved posts</p>
            <p className="text-muted-foreground/60 text-sm mt-1">Bookmark posts to find them here later</p>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post: any) => (
              <div key={post.id} onClick={() => navigate(`/post/${post.id}`)} className="bg-card rounded-xl border p-4 cursor-pointer hover:border-primary/30 transition-colors">
                <div className="flex items-center gap-3 mb-2">
                  <Avatar className="h-8 w-8">
                    {post.profile?.avatar_url && <AvatarImage src={post.profile.avatar_url} className="object-cover" />}
                    <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                      {post.profile ? getInitials(post.profile.full_name) : "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{post.profile?.full_name || "Unknown"}</p>
                    <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</p>
                  </div>
                </div>
                <h3 className="font-bold text-foreground mb-1">{post.title}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2">{post.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default SavedPostsPage;
