import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useAdminRole } from "@/hooks/useAdminRole";

const AdminContentPage = () => {
  const { adminDomain, isGlobalAdmin } = useAdminRole();
  const [posts, setPosts] = useState<any[]>([]);
  const [profileMap, setProfileMap] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  const fetchPosts = async () => {
    if (!adminDomain) return;

    let profilesQuery = supabase.from("profiles").select("user_id, full_name, email_domain");
    if (!isGlobalAdmin) profilesQuery = profilesQuery.eq("email_domain", adminDomain);
    const { data: allProfiles } = await profilesQuery;
    const pMap: Record<string, any> = {};
    (allProfiles || []).forEach(p => { pMap[p.user_id] = p; });
    setProfileMap(pMap);

    if (isGlobalAdmin) {
      const { data } = await supabase.from("posts").select("*").order("created_at", { ascending: false }).limit(100);
      setPosts(data || []);
    } else {
      const userIds = Object.keys(pMap);
      if (userIds.length === 0) { setPosts([]); setLoading(false); return; }
      const { data } = await supabase.from("posts").select("*").in("author_id", userIds).order("created_at", { ascending: false }).limit(100);
      setPosts(data || []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchPosts(); }, [adminDomain, isGlobalAdmin]);

  const deletePost = async (id: string) => {
    const { error } = await supabase.from("posts").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Post deleted" });
      setPosts(prev => prev.filter(p => p.id !== id));
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Content Management</h2>
          {!isGlobalAdmin && adminDomain && (
            <p className="text-sm text-muted-foreground mt-1">Showing content from: @{adminDomain}</p>
          )}
        </div>
        <Card>
          <CardHeader>
            <CardTitle>All Posts ({posts.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground">Loading...</p>
            ) : posts.length === 0 ? (
              <p className="text-muted-foreground">No posts yet</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                     <TableHead>Title</TableHead>
                     <TableHead>Author</TableHead>
                     <TableHead>Type</TableHead>
                     <TableHead>Created</TableHead>
                     <TableHead className="w-20">Actions</TableHead>
                   </TableRow>
                 </TableHeader>
                 <TableBody>
                   {posts.map(post => (
                     <TableRow key={post.id}>
                       <TableCell className="font-medium max-w-xs truncate">{post.title}</TableCell>
                       <TableCell>
                         <div className="flex items-center gap-1.5">
                           <span className="text-sm">{profileMap[post.author_id]?.full_name || "Unknown"}</span>
                           {profileMap[post.author_id]?.email_domain && (
                             <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-muted/50 text-muted-foreground border-border">
                               @{profileMap[post.author_id].email_domain}
                             </Badge>
                           )}
                         </div>
                       </TableCell>
                       <TableCell>{post.type}</TableCell>
                       <TableCell>{new Date(post.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => deletePost(post.id)} className="text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminContentPage;
