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

const AdminCommunitiesPage = () => {
  const { adminDomain, isGlobalAdmin } = useAdminRole();
  const [communities, setCommunities] = useState<any[]>([]);
  const [profileMap, setProfileMap] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  const fetchCommunities = async () => {
    if (!adminDomain) return;

    let profilesQuery = supabase.from("profiles").select("user_id, full_name, email_domain");
    if (!isGlobalAdmin) profilesQuery = profilesQuery.eq("email_domain", adminDomain);
    const { data: allProfiles } = await profilesQuery;
    const pMap: Record<string, any> = {};
    (allProfiles || []).forEach(p => { pMap[p.user_id] = p; });
    setProfileMap(pMap);

    if (isGlobalAdmin) {
      const { data } = await supabase.from("communities").select("*").order("created_at", { ascending: false });
      setCommunities(data || []);
    } else {
      const userIds = Object.keys(pMap);
      if (userIds.length === 0) { setCommunities([]); setLoading(false); return; }
      const { data } = await supabase.from("communities").select("*").in("creator_id", userIds).order("created_at", { ascending: false });
      setCommunities(data || []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchCommunities(); }, [adminDomain, isGlobalAdmin]);

  const deleteCommunity = async (id: string) => {
    const { error } = await supabase.from("communities").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Community deleted" });
      setCommunities(prev => prev.filter(c => c.id !== id));
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Communities Management</h2>
          {!isGlobalAdmin && adminDomain && (
            <p className="text-sm text-muted-foreground mt-1">Showing communities from: @{adminDomain}</p>
          )}
        </div>
        <Card>
          <CardHeader>
            <CardTitle>All Communities ({communities.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground">Loading...</p>
            ) : communities.length === 0 ? (
              <p className="text-muted-foreground">No communities yet</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                     <TableHead>Name</TableHead>
                     <TableHead>Creator</TableHead>
                     <TableHead>Category</TableHead>
                     <TableHead className="w-20">Actions</TableHead>
                   </TableRow>
                 </TableHeader>
                 <TableBody>
                   {communities.map(c => (
                     <TableRow key={c.id}>
                       <TableCell className="font-medium">{c.name}</TableCell>
                       <TableCell>
                         <div className="flex items-center gap-1.5">
                           <span className="text-sm">{profileMap[c.creator_id]?.full_name || "Unknown"}</span>
                           {profileMap[c.creator_id]?.email_domain && (
                             <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-muted/50 text-muted-foreground border-border">
                               @{profileMap[c.creator_id].email_domain}
                             </Badge>
                           )}
                         </div>
                       </TableCell>
                       <TableCell>{c.category}</TableCell>
                       <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => deleteCommunity(c.id)} className="text-destructive hover:text-destructive">
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

export default AdminCommunitiesPage;
