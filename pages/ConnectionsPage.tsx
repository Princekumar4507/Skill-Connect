import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import TabBar from "@/components/TabBar";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Search, Filter, MessageSquare, Users, GraduationCap, Code, Building, UserPlus, Check, X, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface ProfileData {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  college: string | null;
  department: string | null;
  year_of_study: string | null;
  skills: string[] | null;
  bio: string | null;
}

interface ConnectionRow {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: string;
  created_at: string;
}

const filterTags = [
  { icon: GraduationCap, label: "College" },
  { icon: Code, label: "Skills" },
  { icon: Building, label: "Projects" },
  { icon: Users, label: "Mutual Connections" },
];

const tabs = ["My Connections", "Suggestions", "Requests"];

const ConnectionsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState("My Connections");
  const [search, setSearch] = useState("");
  const [messagingUser, setMessagingUser] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [connections, setConnections] = useState<(ConnectionRow & { profile: ProfileData })[]>([]);
  const [suggestions, setSuggestions] = useState<ProfileData[]>([]);
  const [requests, setRequests] = useState<(ConnectionRow & { profile: ProfileData })[]>([]);
  const [pendingSent, setPendingSent] = useState<Set<string>>(new Set());
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);

    // Fetch all connections involving current user
    const { data: allConns } = await supabase
      .from("connections")
      .select("*")
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);

    const connRows = (allConns || []) as ConnectionRow[];

    const accepted = connRows.filter((c) => c.status === "accepted");
    const incomingPending = connRows.filter((c) => c.status === "pending" && c.receiver_id === user.id);
    const sentPendingIds = new Set(connRows.filter((c) => c.status === "pending" && c.sender_id === user.id).map((c) => c.receiver_id));
    setPendingSent(sentPendingIds);

    // Collect user IDs we need profiles for
    const connectedUserIds = accepted.map((c) => c.sender_id === user.id ? c.receiver_id : c.sender_id);
    const requestUserIds = incomingPending.map((c) => c.sender_id);
    const allRelatedIds = new Set([...connectedUserIds, ...requestUserIds]);

    // Fetch profiles for related users
    let profileMap: Record<string, ProfileData> = {};
    if (allRelatedIds.size > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url, college, department, year_of_study, skills, bio")
        .in("user_id", Array.from(allRelatedIds));
      if (profiles) {
        profiles.forEach((p) => { profileMap[p.user_id] = p; });
      }
    }

    // Build connections list
    setConnections(accepted.map((c) => {
      const otherId = c.sender_id === user.id ? c.receiver_id : c.sender_id;
      return { ...c, profile: profileMap[otherId] || { user_id: otherId, full_name: "Unknown", avatar_url: null, college: null, department: null, year_of_study: null, skills: null, bio: null } };
    }));

    // Build requests list
    setRequests(incomingPending.map((c) => ({
      ...c,
      profile: profileMap[c.sender_id] || { user_id: c.sender_id, full_name: "Unknown", avatar_url: null, college: null, department: null, year_of_study: null, skills: null, bio: null },
    })));

    // Fetch suggestions: all profiles not already connected or pending
    const excludeIds = new Set([user.id, ...connRows.map((c) => c.sender_id === user.id ? c.receiver_id : c.sender_id)]);
    const { data: allProfiles } = await supabase
      .from("profiles")
      .select("user_id, full_name, avatar_url, college, department, year_of_study, skills, bio")
      .neq("user_id", user.id)
      .limit(20);

    setSuggestions((allProfiles || []).filter((p) => !excludeIds.has(p.user_id)));
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [user]);

  const handleMessage = async (otherUserId: string, name: string) => {
    if (!user) return;
    setMessagingUser(otherUserId);
    try {
      const { data: myConvos } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", user.id);

      let existingConvoId: string | null = null;
      if (myConvos?.length) {
        for (const mc of myConvos) {
          const { data: other } = await supabase
            .from("conversation_participants")
            .select("id")
            .eq("conversation_id", mc.conversation_id)
            .eq("user_id", otherUserId)
            .maybeSingle();
          if (other) { existingConvoId = mc.conversation_id; break; }
        }
      }

      if (existingConvoId) {
        navigate(`/messages?convo=${existingConvoId}`);
      } else {
        const convoId = crypto.randomUUID();
        const { error: convoError } = await supabase.from("conversations").insert({ id: convoId });
        if (convoError) { toast({ title: "Error", description: convoError.message, variant: "destructive" }); return; }
        const { error: partError } = await supabase.from("conversation_participants").insert([
          { conversation_id: convoId, user_id: user.id },
          { conversation_id: convoId, user_id: otherUserId },
        ]);
        if (partError) { toast({ title: "Error", description: partError.message, variant: "destructive" }); return; }
        navigate(`/messages?convo=${convoId}`);
      }
    } catch {
      toast({ title: "Error", description: "Something went wrong.", variant: "destructive" });
    } finally {
      setMessagingUser(null);
    }
  };

  const sendConnectionRequest = async (receiverId: string) => {
    if (!user) return;
    setActionLoading(receiverId);
    const { error } = await supabase.from("connections").insert({ sender_id: user.id, receiver_id: receiverId });
    if (error) {
      toast({ title: "Error", description: "Could not send request.", variant: "destructive" });
    } else {
      toast({ title: "Request sent!" });
      setPendingSent((prev) => new Set([...prev, receiverId]));
      setSuggestions((prev) => prev.filter((s) => s.user_id !== receiverId));
    }
    setActionLoading(null);
  };

  const respondToRequest = async (connectionId: string, status: "accepted" | "declined") => {
    setActionLoading(connectionId);
    const { error } = await supabase.from("connections").update({ status }).eq("id", connectionId);
    if (error) {
      toast({ title: "Error", description: "Could not update request.", variant: "destructive" });
    } else {
      toast({ title: status === "accepted" ? "Connection accepted!" : "Request declined" });
      fetchData();
    }
    setActionLoading(null);
  };

  const getInitials = (name: string) => name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  const filteredConnections = connections.filter((c) =>
    c.profile.full_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Layout>
      <div className="container py-8">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6 px-4 md:px-0">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Connections</h1>
            <p className="text-muted-foreground text-sm">Connect and collaborate with students</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:flex-none">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search connections..."
                className="pl-9 pr-4 py-2 border rounded-lg text-sm outline-none bg-card focus:ring-1 focus:ring-primary w-full sm:w-64"
              />
            </div>
            <button className="p-2 border rounded-lg hover:bg-secondary transition-colors shrink-0">
              <Filter className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        <TabBar tabs={tabs} active={tab} onChange={setTab} />

        <div className="mt-6">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {tab === "My Connections" && (
                <div>
                  {filteredConnections.length === 0 ? (
                    <div className="text-center py-16">
                      <Users className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
                      <p className="text-muted-foreground font-medium">No connections yet</p>
                      <p className="text-muted-foreground/60 text-sm mt-1">Check out suggestions to find people to connect with</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      {filteredConnections.map((c) => (
                        <div key={c.id} className="bg-card rounded-xl border p-6 text-center">
                          <Avatar className="h-16 w-16 mx-auto mb-3">
                            <AvatarFallback className="bg-muted text-muted-foreground text-lg">
                              {getInitials(c.profile.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          <h3 className="font-semibold text-foreground">{c.profile.full_name}</h3>
                          {c.profile.college && (
                            <span className="inline-block text-xs border rounded-full px-2 py-0.5 mt-1 text-muted-foreground">{c.profile.college}</span>
                          )}
                          {(c.profile.department || c.profile.year_of_study) && (
                            <p className="text-sm text-muted-foreground mt-2">
                              {[c.profile.department, c.profile.year_of_study].filter(Boolean).join(" • ")}
                            </p>
                          )}
                          {c.profile.skills && c.profile.skills.length > 0 && (
                            <div className="flex flex-wrap justify-center gap-1.5 mt-3">
                              {c.profile.skills.slice(0, 3).map((s) => (
                                <span key={s} className="text-xs px-2 py-0.5 rounded-full bg-accent/20 text-accent font-medium">{s}</span>
                              ))}
                            </div>
                          )}
                          <div className="flex gap-2 mt-4">
                            <button
                              onClick={() => handleMessage(c.profile.user_id, c.profile.full_name)}
                              disabled={messagingUser === c.profile.user_id}
                              className="flex-1 flex items-center justify-center gap-1.5 border rounded-lg py-2 text-sm text-muted-foreground hover:text-foreground hover:border-primary transition-colors disabled:opacity-50"
                            >
                              <MessageSquare className="h-3.5 w-3.5" />
                              {messagingUser === c.profile.user_id ? "Opening..." : "Message"}
                            </button>
                            <button
                              onClick={() => navigate(`/user/${c.profile.user_id}`)}
                              className="flex-1 border rounded-lg py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                            >
                              View Profile
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {tab === "Suggestions" && (
                <>
                  <div className="mb-6">
                    <h2 className="font-bold text-foreground mb-3">Find Students By</h2>
                    <div className="flex gap-2 flex-wrap">
                      {filterTags.map(({ icon: Icon, label }) => (
                        <button key={label} className="flex items-center gap-1.5 px-4 py-2 rounded-full border text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                          <Icon className="h-4 w-4" /> {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  {suggestions.length === 0 ? (
                    <div className="text-center py-16">
                      <UserPlus className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
                      <p className="text-muted-foreground font-medium">No suggestions right now</p>
                      <p className="text-muted-foreground/60 text-sm mt-1">Check back later as more students join</p>
                    </div>
                  ) : (
                    <>
                      <h2 className="font-bold text-foreground mb-4">Suggested Connections</h2>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {suggestions.map((s) => (
                          <div key={s.user_id} className="bg-card rounded-xl border p-6 text-center">
                            <Avatar className="h-16 w-16 mx-auto mb-3">
                              <AvatarFallback className="bg-muted text-muted-foreground text-lg">
                                {getInitials(s.full_name)}
                              </AvatarFallback>
                            </Avatar>
                            <h3 className="font-semibold text-foreground">{s.full_name}</h3>
                            {s.college && (
                              <span className="inline-block text-xs border rounded-full px-2 py-0.5 mt-1 text-muted-foreground">{s.college}</span>
                            )}
                            {(s.department || s.year_of_study) && (
                              <p className="text-sm text-muted-foreground mt-2">
                                {[s.department, s.year_of_study].filter(Boolean).join(" • ")}
                              </p>
                            )}
                            {s.skills && s.skills.length > 0 && (
                              <div className="flex flex-wrap justify-center gap-1.5 mt-3">
                                {s.skills.slice(0, 3).map((sk) => (
                                  <span key={sk} className="text-xs px-2 py-0.5 rounded-full bg-accent/20 text-accent font-medium">{sk}</span>
                                ))}
                              </div>
                            )}
                            <button
                              onClick={() => sendConnectionRequest(s.user_id)}
                              disabled={actionLoading === s.user_id || pendingSent.has(s.user_id)}
                              className="mt-4 gradient-primary text-primary-foreground px-6 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 mx-auto hover:opacity-90 transition-opacity disabled:opacity-60"
                            >
                              {actionLoading === s.user_id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : pendingSent.has(s.user_id) ? (
                                <>
                                  <Check className="h-4 w-4" /> Pending
                                </>
                              ) : (
                                <>
                                  <UserPlus className="h-4 w-4" /> Connect
                                </>
                              )}
                            </button>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </>
              )}

              {tab === "Requests" && (
                <div>
                  {requests.length === 0 ? (
                    <div className="text-center py-16">
                      <Users className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
                      <p className="text-muted-foreground font-medium">No pending requests</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {requests.map((r) => (
                        <div key={r.id} className="bg-card rounded-xl border p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                          <div className="flex items-center gap-4">
                            <Avatar className="h-12 w-12">
                              <AvatarFallback className="bg-muted text-muted-foreground">
                                {getInitials(r.profile.full_name)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-semibold text-foreground">{r.profile.full_name}</h3>
                                {r.profile.college && (
                                  <span className="text-xs border rounded-full px-2 py-0.5 text-muted-foreground">{r.profile.college}</span>
                                )}
                                {r.profile.department && (
                                  <span className="text-sm text-muted-foreground">{r.profile.department}</span>
                                )}
                              </div>
                              {r.profile.bio && (
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{r.profile.bio}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2 sm:shrink-0">
                            <button
                              onClick={() => respondToRequest(r.id, "accepted")}
                              disabled={actionLoading === r.id}
                              className="gradient-primary text-primary-foreground px-5 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center gap-1.5"
                            >
                              {actionLoading === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                              Accept
                            </button>
                            <button
                              onClick={() => respondToRequest(r.id, "declined")}
                              disabled={actionLoading === r.id}
                              className="border px-5 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground transition-colors disabled:opacity-60 flex items-center gap-1.5"
                            >
                              <X className="h-4 w-4" /> Decline
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default ConnectionsPage;
