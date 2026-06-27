import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Calendar, UsersRound, FileText } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { useAdminRole } from "@/hooks/useAdminRole";

const AdminDashboard = () => {
  const { adminDomain, isGlobalAdmin } = useAdminRole();
  const [stats, setStats] = useState({ users: 0, events: 0, communities: 0, posts: 0 });

  useEffect(() => {
    if (!adminDomain) return;

    const fetchStats = async () => {
      // Build queries with domain filter unless global admin
      let profilesQ = supabase.from("profiles").select("id", { count: "exact", head: true });
      let postsQ = supabase.from("posts").select("id, profiles!inner(email_domain)", { count: "exact", head: true });
      let eventsQ = supabase.from("events").select("id", { count: "exact", head: true });
      let communitiesQ = supabase.from("communities").select("id", { count: "exact", head: true });

      if (!isGlobalAdmin) {
        profilesQ = profilesQ.eq("email_domain", adminDomain);
        // For posts, events, communities we need to filter by creator's domain
        // We'll do separate queries using profiles join
      }

      const [profiles, events, communities, posts] = await Promise.all([
        profilesQ,
        isGlobalAdmin
          ? eventsQ
          : supabase.from("profiles").select("user_id").eq("email_domain", adminDomain).then(async ({ data: domainUsers }) => {
              const userIds = (domainUsers || []).map(u => u.user_id);
              if (userIds.length === 0) return { count: 0 };
              return supabase.from("events").select("id", { count: "exact", head: true }).in("creator_id", userIds);
            }),
        isGlobalAdmin
          ? communitiesQ
          : supabase.from("profiles").select("user_id").eq("email_domain", adminDomain).then(async ({ data: domainUsers }) => {
              const userIds = (domainUsers || []).map(u => u.user_id);
              if (userIds.length === 0) return { count: 0 };
              return supabase.from("communities").select("id", { count: "exact", head: true }).in("creator_id", userIds);
            }),
        isGlobalAdmin
          ? supabase.from("posts").select("id", { count: "exact", head: true })
          : supabase.from("profiles").select("user_id").eq("email_domain", adminDomain).then(async ({ data: domainUsers }) => {
              const userIds = (domainUsers || []).map(u => u.user_id);
              if (userIds.length === 0) return { count: 0 };
              return supabase.from("posts").select("id", { count: "exact", head: true }).in("author_id", userIds);
            }),
      ]);

      setStats({
        users: profiles.count || 0,
        events: events.count || 0,
        communities: communities.count || 0,
        posts: posts.count || 0,
      });
    };
    fetchStats();
  }, [adminDomain, isGlobalAdmin]);

  const cards = [
    { label: "Total Users", value: stats.users, icon: Users, color: "text-blue-500" },
    { label: "Total Events", value: stats.events, icon: Calendar, color: "text-green-500" },
    { label: "Communities", value: stats.communities, icon: UsersRound, color: "text-purple-500" },
    { label: "Total Posts", value: stats.posts, icon: FileText, color: "text-orange-500" },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Dashboard</h2>
          {!isGlobalAdmin && adminDomain && (
            <p className="text-sm text-muted-foreground mt-1">Showing data for: @{adminDomain}</p>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map(c => (
            <Card key={c.label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{c.label}</CardTitle>
                <c.icon className={`h-5 w-5 ${c.color}`} />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-foreground">{c.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
