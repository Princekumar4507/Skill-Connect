import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Search, UserPlus, MessageSquare, GraduationCap, Code, Loader2, Users,
  MapPin, Sparkles, Building2, X,
} from "lucide-react";
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
  interests: string[] | null;
  location: string | null;
}

const PAGE_SIZE = 20;

const DiscoverPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<ProfileData[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [connectingTo, setConnectingTo] = useState<string | null>(null);
  const [connectedIds, setConnectedIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState<number | null>(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset when search changes
  useEffect(() => {
    setProfiles([]);
    setPage(0);
    setHasMore(true);
    setTotalCount(null);
  }, [debouncedSearch]);

  // Fetch connections once
  useEffect(() => {
    if (!user) return;
    supabase
      .from("connections")
      .select("sender_id, receiver_id")
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .then(({ data }) => {
        const ids = new Set<string>();
        (data || []).forEach((c) => {
          ids.add(c.sender_id === user.id ? c.receiver_id : c.sender_id);
        });
        setConnectedIds(ids);
      });
  }, [user]);

  // Fetch profiles with server-side search + pagination
  const fetchProfiles = useCallback(async (pageNum: number) => {
    if (!user) return;
    setLoading(true);

    let query = supabase
      .from("profiles")
      .select("user_id, full_name, avatar_url, college, department, year_of_study, skills, bio, interests, location" as any, { count: "exact" })
      .neq("user_id", user.id)
      .order("full_name", { ascending: true })
      .range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1);

    if (debouncedSearch) {
      const q = `%${debouncedSearch}%`;
      query = query.or(`full_name.ilike.${q},college.ilike.${q},department.ilike.${q},bio.ilike.${q}`);
    }

    const { data, count, error } = await query;

    if (error) {
      setLoading(false);
      setInitialLoading(false);
      return;
    }

    const fetched = (data as unknown as ProfileData[]) || [];

    if (pageNum === 0) {
      setProfiles(fetched);
    } else {
      setProfiles((prev) => [...prev, ...fetched]);
    }

    if (count !== null) setTotalCount(count);
    setHasMore(fetched.length === PAGE_SIZE);
    setLoading(false);
    setInitialLoading(false);
  }, [user, debouncedSearch]);

  // Trigger fetch on page/search change
  useEffect(() => {
    fetchProfiles(page);
  }, [page, fetchProfiles]);

  const loadMore = () => {
    if (!loading && hasMore) setPage((p) => p + 1);
  };

  const handleConnect = async (receiverId: string) => {
    if (!user) return;
    setConnectingTo(receiverId);
    const { error } = await supabase.from("connections").insert({ sender_id: user.id, receiver_id: receiverId });
    if (error) toast({ title: "Error", description: "Could not send request.", variant: "destructive" });
    else { toast({ title: "Request sent!" }); setConnectedIds((prev) => new Set([...prev, receiverId])); }
    setConnectingTo(null);
  };

  const getInitials = (name: string) => name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  if (!user) return <Layout><div className="container py-16 text-center"><p className="text-muted-foreground">Please sign in to discover students.</p></div></Layout>;

  return (
    <Layout>
      <div className="container py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Discover Students</h1>
          <p className="text-muted-foreground mt-1">Find and connect with students by name, college, or department</p>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search by name, college, department..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-11 h-12 text-base bg-card"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
              </button>
            )}
          </div>
        </div>

        {/* Results */}
        {initialLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : profiles.length === 0 && !loading ? (
          <div className="text-center py-16">
            <Users className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-foreground font-medium text-lg">No students found</p>
            <p className="text-muted-foreground text-sm mt-1">Try a different search term</p>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-4">
              {totalCount !== null ? `${totalCount} student${totalCount !== 1 ? "s" : ""} found` : `${profiles.length} students loaded`}
            </p>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {profiles.map((p) => (
                <Card key={p.user_id} className="hover:shadow-md transition-shadow overflow-hidden">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      <Avatar className="h-14 w-14 cursor-pointer shrink-0" onClick={() => navigate(`/user/${p.user_id}`)}>
                        {p.avatar_url && <AvatarImage src={p.avatar_url} alt={p.full_name} />}
                        <AvatarFallback className="bg-muted text-muted-foreground text-lg">
                          {getInitials(p.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <button onClick={() => navigate(`/user/${p.user_id}`)} className="font-semibold text-foreground hover:text-primary transition-colors text-left truncate block">
                          {p.full_name}
                        </button>
                        {p.college && (
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                            <GraduationCap className="h-3 w-3" />{p.college}
                          </span>
                        )}
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
                          {p.department && <span className="text-xs text-muted-foreground">{p.department}</span>}
                          {p.year_of_study && <span className="text-xs text-muted-foreground">{p.year_of_study}</span>}
                          {p.location && (
                            <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
                              <MapPin className="h-3 w-3" />{p.location}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {p.bio && <p className="text-sm text-muted-foreground mt-3 line-clamp-2">{p.bio}</p>}

                    {p.skills && p.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {p.skills.slice(0, 4).map((s) => (
                          <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                        ))}
                        {p.skills.length > 4 && (
                          <span className="text-xs text-muted-foreground self-center">+{p.skills.length - 4}</span>
                        )}
                      </div>
                    )}

                    {p.interests && (p.interests as string[]).length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {(p.interests as string[]).slice(0, 3).map((i) => (
                          <Badge key={i} className="text-xs bg-accent/15 text-accent-foreground border border-accent/30">{i}</Badge>
                        ))}
                        {(p.interests as string[]).length > 3 && (
                          <span className="text-xs text-muted-foreground self-center">+{(p.interests as string[]).length - 3}</span>
                        )}
                      </div>
                    )}

                    <div className="flex gap-2 mt-4">
                      <Button variant="outline" size="sm" className="flex-1" onClick={() => navigate(`/user/${p.user_id}`)}>
                        View Profile
                      </Button>
                      {connectedIds.has(p.user_id) ? (
                        <Button variant="outline" size="sm" disabled className="flex-1">
                          <MessageSquare className="h-3.5 w-3.5 mr-1.5" /> Connected
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          className="flex-1 gradient-primary"
                          onClick={() => handleConnect(p.user_id)}
                          disabled={connectingTo === p.user_id}
                        >
                          {connectingTo === p.user_id ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <UserPlus className="h-3.5 w-3.5 mr-1.5" />}
                          Connect
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Load More */}
            {hasMore && (
              <div className="flex justify-center mt-8">
                <Button variant="outline" onClick={loadMore} disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Load More
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
};

export default DiscoverPage;
