import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Trash2, Search, Shield, Users, AlertCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAdminRole } from "@/hooks/useAdminRole";

const ROLES = [
  { value: "super_admin", label: "Super Admin", description: "Full access" },
  { value: "events_team", label: "Events Team", description: "Manage events" },
  { value: "community_moderator", label: "Community Moderator", description: "Moderate communities" },
  { value: "content_moderator", label: "Content Moderator", description: "Moderate posts" },
];

const roleBadgeColor: Record<string, string> = {
  super_admin: "bg-red-500/10 text-red-500 border-red-500/20",
  events_team: "bg-green-500/10 text-green-500 border-green-500/20",
  community_moderator: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  content_moderator: "bg-orange-500/10 text-orange-500 border-orange-500/20",
};

const AdminRolesPage = () => {
  const { adminDomain, isGlobalAdmin } = useAdminRole();
  const [userRoles, setUserRoles] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState("");
  const [selectedUserName, setSelectedUserName] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  const [loading, setLoading] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);

  const fetchData = async () => {
    if (!adminDomain) return;
    setLoading(true);

    // Fetch profiles filtered by domain (unless global admin)
    let profilesQuery = supabase.from("profiles").select("user_id, full_name, avatar_url, college, username, email_domain");
    if (!isGlobalAdmin) {
      profilesQuery = profilesQuery.eq("email_domain", adminDomain);
    }

    const [{ data: roles }, { data: allProfiles }] = await Promise.all([
      supabase.from("user_roles").select("*"),
      profilesQuery,
    ]);

    const profileMap: Record<string, any> = {};
    (allProfiles || []).forEach(p => { profileMap[p.user_id] = p; });

    // Filter roles to only show users from admin's domain
    const enriched = (roles || [])
      .map(r => ({ ...r, profile: profileMap[r.user_id] }))
      .filter(r => isGlobalAdmin || r.profile); // only show roles for users in admin's domain

    setUserRoles(enriched);
    setProfiles(allProfiles || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [adminDomain, isGlobalAdmin]);

  const assignRole = async () => {
    if (!selectedUser || !selectedRole) {
      toast({ title: "User aur role dono select karo", variant: "destructive" });
      return;
    }

    const existing = userRoles.find(r => r.user_id === selectedUser && r.role === selectedRole);
    if (existing) {
      toast({ title: "Is user ke paas ye role pehle se hai", variant: "destructive" });
      return;
    }

    const { error } = await supabase.from("user_roles").insert({
      user_id: selectedUser,
      role: selectedRole as any,
    });

    if (error) {
      if (error.code === "23505") {
        toast({ title: "User ke paas ye role pehle se hai", variant: "destructive" });
      } else {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      }
    } else {
      toast({ title: "Role assign ho gaya! ✅" });
      setSelectedUser("");
      setSelectedUserName("");
      setSelectedRole("");
      setSearch("");
      fetchData();
    }
  };

  const removeRole = async (id: string) => {
    const { error } = await supabase.from("user_roles").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Role remove ho gaya" });
      setUserRoles(prev => prev.filter(r => r.id !== id));
    }
  };

  const filteredProfiles = profiles.filter(p => {
    if (!search.trim()) return false;
    const s = search.toLowerCase();
    return (
      (p.full_name || "").toLowerCase().includes(s) ||
      (p.username || "").toLowerCase().includes(s) ||
      (p.college || "").toLowerCase().includes(s)
    );
  });

  const handleSelectUser = (profile: any) => {
    setSelectedUser(profile.user_id);
    setSelectedUserName(profile.full_name || profile.username || "Unknown");
    setSearch("");
    setShowDropdown(false);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" /> Manage Roles
          </h2>
          <p className="text-muted-foreground mt-1">
            Users ko roles assign ya remove karo
            {!isGlobalAdmin && adminDomain && <span className="ml-1">— @{adminDomain} only</span>}
          </p>
        </div>

        {/* Instructions */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-4">
            <div className="flex gap-2 items-start">
              <AlertCircle className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <div className="text-sm space-y-1">
                <p className="font-medium text-foreground">Kaise kaam karta hai:</p>
                <ol className="list-decimal list-inside text-muted-foreground space-y-0.5">
                  <li>Search box me user ka naam, username ya college type karo</li>
                  <li>Dropdown se user select karo</li>
                  <li>Role choose karo → "Assign" click karo</li>
                </ol>
                <p className="text-muted-foreground pt-1 text-xs">
                  <strong>Super Admin</strong> = full access &nbsp;|&nbsp; <strong>Events Team</strong> = events &nbsp;|&nbsp; <strong>Community Mod</strong> = communities &nbsp;|&nbsp; <strong>Content Mod</strong> = posts
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Assign Role */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" /> Assign Role
            </CardTitle>
            <CardDescription>User search karo, role select karo, assign karo</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              {selectedUser && (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 border">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Selected: {selectedUserName}</span>
                  <Button variant="ghost" size="sm" className="ml-auto h-6 px-2 text-xs" onClick={() => { setSelectedUser(""); setSelectedUserName(""); }}>
                    Change
                  </Button>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                {!selectedUser && (
                  <div className="flex-1 relative">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Naam, username ya college type karo..."
                        value={search}
                        onChange={e => { setSearch(e.target.value); setShowDropdown(true); }}
                        onFocus={() => search && setShowDropdown(true)}
                        onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                        className="pl-10"
                      />
                    </div>
                    {showDropdown && search.trim().length > 0 && (
                      <div className="absolute z-50 w-full border rounded-lg max-h-48 overflow-y-auto bg-card shadow-lg mt-1">
                        {filteredProfiles.length === 0 ? (
                          <div className="px-3 py-4 text-sm text-muted-foreground text-center">
                            Koi user nahi mila "{search}" ke liye
                          </div>
                        ) : (
                          filteredProfiles.slice(0, 10).map(p => (
                            <button
                              key={p.user_id}
                              onMouseDown={e => e.preventDefault()}
                              onClick={() => handleSelectUser(p)}
                              className="w-full text-left px-3 py-2.5 hover:bg-muted/50 flex items-center gap-3 border-b last:border-b-0"
                            >
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={p.avatar_url} />
                                <AvatarFallback className="text-xs">{(p.full_name || "?")[0]?.toUpperCase()}</AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">{p.full_name || "No Name"}</p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {p.username ? `@${p.username}` : ""}{p.college ? ` • ${p.college}` : ""}
                                </p>
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}

                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger className="w-full sm:w-56">
                    <SelectValue placeholder="Role select karo" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map(r => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button onClick={assignRole} disabled={!selectedUser || !selectedRole}>
                  Assign
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Current Roles */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" /> Current Assignments ({userRoles.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
                <span className="ml-2 text-muted-foreground">Loading...</span>
              </div>
            ) : userRoles.length === 0 ? (
              <div className="text-center py-8">
                <Shield className="h-12 w-12 mx-auto text-muted-foreground/30 mb-2" />
                <p className="text-muted-foreground">Koi role assign nahi hua abhi tak</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="w-20">Remove</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {userRoles.map(r => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={r.profile?.avatar_url} />
                            <AvatarFallback className="text-xs">{(r.profile?.full_name || "?")[0]?.toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <span className="font-medium">{r.profile?.full_name || "Unknown"}</span>
                            {r.profile?.email_domain && (
                              <Badge variant="outline" className="ml-2 text-[10px] px-1.5 py-0 bg-muted/50 text-muted-foreground border-border">
                                @{r.profile.email_domain}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={roleBadgeColor[r.role] || ""}>
                          {ROLES.find(role => role.value === r.role)?.label || r.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(r.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => removeRole(r.id)} className="text-destructive hover:text-destructive">
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

export default AdminRolesPage;
