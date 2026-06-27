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

const AdminEventsPage = () => {
  const { adminDomain, isGlobalAdmin } = useAdminRole();
  const [events, setEvents] = useState<any[]>([]);
  const [profileMap, setProfileMap] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  const fetchEvents = async () => {
    if (!adminDomain) return;
    
    let profilesQuery = supabase.from("profiles").select("user_id, full_name, email_domain");
    if (!isGlobalAdmin) profilesQuery = profilesQuery.eq("email_domain", adminDomain);
    const { data: allProfiles } = await profilesQuery;
    const pMap: Record<string, any> = {};
    (allProfiles || []).forEach(p => { pMap[p.user_id] = p; });
    setProfileMap(pMap);

    if (isGlobalAdmin) {
      const { data } = await supabase.from("events").select("*").order("created_at", { ascending: false });
      setEvents(data || []);
    } else {
      const userIds = Object.keys(pMap);
      if (userIds.length === 0) { setEvents([]); setLoading(false); return; }
      const { data } = await supabase.from("events").select("*").in("creator_id", userIds).order("created_at", { ascending: false });
      setEvents(data || []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchEvents(); }, [adminDomain, isGlobalAdmin]);

  const deleteEvent = async (id: string) => {
    const { error } = await supabase.from("events").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Event deleted" });
      setEvents(prev => prev.filter(e => e.id !== id));
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Events Management</h2>
          {!isGlobalAdmin && adminDomain && (
            <p className="text-sm text-muted-foreground mt-1">Showing events from: @{adminDomain}</p>
          )}
        </div>
        <Card>
          <CardHeader>
            <CardTitle>All Events ({events.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground">Loading...</p>
            ) : events.length === 0 ? (
              <p className="text-muted-foreground">No events yet</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                     <TableHead>Title</TableHead>
                     <TableHead>Creator</TableHead>
                     <TableHead>Type</TableHead>
                     <TableHead>Date</TableHead>
                     <TableHead className="w-20">Actions</TableHead>
                   </TableRow>
                 </TableHeader>
                 <TableBody>
                   {events.map(event => (
                     <TableRow key={event.id}>
                       <TableCell className="font-medium">{event.title}</TableCell>
                       <TableCell>
                         <div className="flex items-center gap-1.5">
                           <span className="text-sm">{profileMap[event.creator_id]?.full_name || "Unknown"}</span>
                           {profileMap[event.creator_id]?.email_domain && (
                             <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-muted/50 text-muted-foreground border-border">
                               @{profileMap[event.creator_id].email_domain}
                             </Badge>
                           )}
                         </div>
                       </TableCell>
                       <TableCell>{event.type}</TableCell>
                       <TableCell>{event.date}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => deleteEvent(event.id)} className="text-destructive hover:text-destructive">
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

export default AdminEventsPage;
