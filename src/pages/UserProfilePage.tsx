import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Github, Linkedin, GraduationCap, MessageSquare, ArrowLeft, UserPlus, Check, Loader2,
  MapPin, Globe, Trophy, BookOpen, Sparkles, ExternalLink, FileText, Download, Languages, CalendarDays,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface ProjectItem { name: string; description: string; url?: string; }
interface AchievementItem { title: string; description: string; year?: string; }

interface ProfileData {
  full_name: string;
  username: string | null;
  bio: string | null;
  college: string | null;
  department: string | null;
  year_of_study: string | null;
  skills: string[] | null;
  projects: ProjectItem[] | null;
  linkedin_url: string | null;
  github_url: string | null;
  avatar_url: string | null;
  user_id: string;
  location: string | null;
  interests: string[] | null;
  achievements: AchievementItem[] | null;
  portfolio_url: string | null;
  resume_url: string | null;
  cgpa: string | null;
  enrollment_number: string | null;
  cover_url: string | null;
  about_me: string | null;
  expected_graduation: string | null;
  languages: string[] | null;
}

const UserProfilePage = () => {
  const { userId } = useParams<{ userId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [stats, setStats] = useState({ connections: 0, posts: 0 });

  useEffect(() => {
    if (!userId) return;
    const fetchData = async () => {
      setLoading(true);
      const [{ data }, { count: connCount }, { count: postCount }] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
        supabase.from("connections").select("*", { count: "exact", head: true })
          .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`).eq("status", "accepted"),
        supabase.from("posts").select("*", { count: "exact", head: true }).eq("author_id", userId),
      ]);

      if (data) {
        setProfile({
          ...data,
          projects: (data.projects as unknown as ProjectItem[]) || [],
          achievements: ((data as any).achievements as AchievementItem[] | null) || [],
          location: (data as any).location || null,
          interests: (data as any).interests || null,
          portfolio_url: (data as any).portfolio_url || null,
          resume_url: (data as any).resume_url || null,
          cgpa: (data as any).cgpa || null,
          enrollment_number: (data as any).enrollment_number || null,
          cover_url: data.cover_url || null,
          about_me: (data as any).about_me || null,
          expected_graduation: (data as any).expected_graduation || null,
          languages: (data as any).languages || null,
        } as ProfileData);
      } else {
        setProfile(null);
      }
      setStats({ connections: connCount || 0, posts: postCount || 0 });

      if (user && userId !== user.id) {
        const { data: conn } = await supabase
          .from("connections").select("status, sender_id")
          .or(`and(sender_id.eq.${user.id},receiver_id.eq.${userId}),and(sender_id.eq.${userId},receiver_id.eq.${user.id})`)
          .maybeSingle();
        setConnectionStatus(conn?.status || null);
      }
      setLoading(false);
    };
    fetchData();
  }, [userId, user]);

  const handleConnect = async () => {
    if (!user || !userId) return;
    setActionLoading(true);
    const { error } = await supabase.from("connections").insert({ sender_id: user.id, receiver_id: userId });
    if (error) toast({ title: "Error", description: "Could not send request.", variant: "destructive" });
    else { toast({ title: "Connection request sent!" }); setConnectionStatus("pending"); }
    setActionLoading(false);
  };

  const handleMessage = async () => {
    if (!user || !userId) return;
    setActionLoading(true);
    try {
      const { data: myConvos } = await supabase.from("conversation_participants").select("conversation_id").eq("user_id", user.id);
      let convoId: string | null = null;
      if (myConvos?.length) {
        for (const mc of myConvos) {
          const { data: other } = await supabase.from("conversation_participants").select("id").eq("conversation_id", mc.conversation_id).eq("user_id", userId).maybeSingle();
          if (other) { convoId = mc.conversation_id; break; }
        }
      }
      if (!convoId) {
        const newId = crypto.randomUUID();
        const { error: convoError } = await supabase.from("conversations").insert({ id: newId });
        if (convoError) { toast({ title: "Error", description: convoError.message, variant: "destructive" }); setActionLoading(false); return; }
        const { error: partError } = await supabase.from("conversation_participants").insert([
          { conversation_id: newId, user_id: user.id },
          { conversation_id: newId, user_id: userId },
        ]);
        if (partError) { toast({ title: "Error", description: partError.message, variant: "destructive" }); setActionLoading(false); return; }
        convoId = newId;
      }
      if (convoId) navigate(`/messages?convo=${convoId}`);
    } catch { toast({ title: "Error", variant: "destructive" }); }
    setActionLoading(false);
  };

  const isOwnProfile = user?.id === userId;

  if (loading) return <Layout><div className="container py-16 flex justify-center"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div></Layout>;
  if (!profile) return <Layout><div className="container py-16 text-center"><p className="text-muted-foreground">User not found.</p></div></Layout>;

  const initials = profile.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <Layout>
      <div className="container py-8 max-w-4xl">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        {/* Cover Banner */}
        <div className="relative h-36 md:h-48 rounded-t-2xl overflow-hidden" style={{ background: "var(--gradient-primary)" }}>
          {profile.cover_url && (
            <img src={profile.cover_url} alt="Cover" className="absolute inset-0 w-full h-full object-cover" />
          )}
          <div className="absolute inset-0 bg-black/10" />
          <div className="absolute bottom-4 right-4 flex gap-2">
            {!isOwnProfile && user && (
              <>
                {connectionStatus === "accepted" ? (
                  <Button variant="outline" onClick={handleMessage} disabled={actionLoading} className="bg-card/80 backdrop-blur-sm border-white/20 text-foreground hover:bg-card">
                    <MessageSquare className="h-4 w-4 mr-1.5" /> Message
                  </Button>
                ) : connectionStatus === "pending" ? (
                  <Button variant="outline" disabled className="bg-card/80 backdrop-blur-sm border-white/20 text-foreground">
                    <Check className="h-4 w-4 mr-1.5" /> Pending
                  </Button>
                ) : (
                  <Button onClick={handleConnect} disabled={actionLoading} className="gradient-primary shadow-lg">
                    {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <UserPlus className="h-4 w-4 mr-1.5" />}
                    Connect
                  </Button>
                )}
              </>
            )}
            {isOwnProfile && (
              <Button variant="outline" onClick={() => navigate("/profile")} className="bg-card/80 backdrop-blur-sm border-white/20 text-foreground hover:bg-card">Edit Profile</Button>
            )}
          </div>
        </div>

        {/* Avatar + Info */}
        <Card className="rounded-t-none border-t-0 mb-6">
          <CardContent className="pt-0">
            <div className="flex flex-col md:flex-row items-start gap-5 -mt-12 md:-mt-14">
              <Avatar className="h-24 w-24 md:h-28 md:w-28 text-3xl border-4 border-card shadow-lg z-10 shrink-0">
                {profile.avatar_url && <AvatarImage src={profile.avatar_url} alt="Avatar" />}
                <AvatarFallback className="gradient-primary text-primary-foreground">{initials || "?"}</AvatarFallback>
              </Avatar>
              <div className="flex-1 pt-14 md:pt-16">
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-2xl md:text-3xl font-bold text-foreground">{profile.full_name}</h1>
                  {profile.username && <Badge variant="secondary" className="text-sm">@{profile.username}</Badge>}
                </div>
                <p className="text-muted-foreground mt-1.5 max-w-xl">{profile.bio || "No bio yet"}</p>
                <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-muted-foreground">
                  {profile.location && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{profile.location}</span>}
                  {profile.college && <span className="flex items-center gap-1"><GraduationCap className="h-3.5 w-3.5" />{profile.college}</span>}
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 mt-6 pt-5 border-t border-border">
              <div className="text-center">
                <p className="text-2xl font-bold text-foreground">{stats.connections}</p>
                <p className="text-xs text-muted-foreground">Connections</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-foreground">{stats.posts}</p>
                <p className="text-xs text-muted-foreground">Posts</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* About Me */}
        {profile.about_me && (
          <Card className="mb-6">
            <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><FileText className="h-5 w-5 text-primary" />About Me</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">{profile.about_me}</p>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          {/* Academic Info */}
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><GraduationCap className="h-5 w-5 text-primary" />Academic Info</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">College</span><span className="text-foreground font-medium text-right">{profile.college || "—"}</span></div>
                <Separator />
                <div className="flex justify-between"><span className="text-muted-foreground">Department</span><span className="text-foreground font-medium text-right">{profile.department || "—"}</span></div>
                <Separator />
                <div className="flex justify-between"><span className="text-muted-foreground">Year</span><span className="text-foreground font-medium">{profile.year_of_study || "—"}</span></div>
                 {profile.cgpa && (
                   <>
                     <Separator />
                     <div className="flex justify-between"><span className="text-muted-foreground">CGPA</span><span className="text-foreground font-medium">{profile.cgpa}</span></div>
                   </>
                 )}
                 {profile.enrollment_number && (
                   <>
                     <Separator />
                     <div className="flex justify-between"><span className="text-muted-foreground">Enrollment No.</span><span className="text-foreground font-medium">{profile.enrollment_number}</span></div>
                   </>
                 )}
                 {profile.expected_graduation && (
                   <>
                     <Separator />
                     <div className="flex justify-between"><span className="text-muted-foreground flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />Graduation</span><span className="text-foreground font-medium">{profile.expected_graduation}</span></div>
                   </>
                 )}
              </div>
            </CardContent>
          </Card>

          {/* Links */}
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Globe className="h-5 w-5 text-primary" />Links & Socials</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {profile.linkedin_url && (
                  <a href={profile.linkedin_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 p-2.5 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors text-sm text-foreground">
                    <Linkedin className="h-4 w-4 text-primary" /><span className="flex-1">LinkedIn</span><ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                  </a>
                )}
                {profile.github_url && (
                  <a href={profile.github_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 p-2.5 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors text-sm text-foreground">
                    <Github className="h-4 w-4 text-primary" /><span className="flex-1">GitHub</span><ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                  </a>
                )}
                {profile.portfolio_url && (
                  <a href={profile.portfolio_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 p-2.5 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors text-sm text-foreground">
                    <Globe className="h-4 w-4 text-primary" /><span className="flex-1">Portfolio</span><ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                  </a>
                )}
                {profile.resume_url && (
                  <a href={profile.resume_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 p-2.5 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors text-sm text-foreground">
                    <FileText className="h-4 w-4 text-primary" /><span className="flex-1">Resume</span><Download className="h-3.5 w-3.5 text-muted-foreground" />
                  </a>
                )}
                {!profile.linkedin_url && !profile.github_url && !profile.portfolio_url && !profile.resume_url && (
                  <p className="text-sm text-muted-foreground">No links added</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Skills */}
        {profile.skills && profile.skills.length > 0 && (
          <Card className="mt-6">
            <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><BookOpen className="h-5 w-5 text-primary" />Skills</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {profile.skills.map((skill) => <Badge key={skill} variant="secondary" className="px-3 py-1">{skill}</Badge>)}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Interests */}
        {profile.interests && profile.interests.length > 0 && (
          <Card className="mt-6">
            <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Sparkles className="h-5 w-5 text-primary" />Interests & Hobbies</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {profile.interests.map((interest) => (
                  <Badge key={interest} className="px-3 py-1 bg-accent/15 text-accent-foreground border border-accent/30">{interest}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}


        {/* Languages */}
        {profile.languages && profile.languages.length > 0 && (
          <Card className="mt-6">
            <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Languages className="h-5 w-5 text-primary" />Languages</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {profile.languages.map((lang) => (
                  <Badge key={lang} className="px-3 py-1.5 bg-primary/10 text-primary border border-primary/20 gap-1.5">
                    <Globe className="h-3 w-3" />{lang}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Achievements */}
        {profile.achievements && profile.achievements.length > 0 && (
          <Card className="mt-6">
            <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Trophy className="h-5 w-5 text-primary" />Achievements & Certifications</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {profile.achievements.map((ach, i) => (
                  <div key={i} className="p-3.5 rounded-lg bg-secondary/50 border border-border/50 flex gap-3 items-start">
                    <div className="h-8 w-8 rounded-full flex items-center justify-center shrink-0 text-primary-foreground text-xs font-bold" style={{ background: "var(--gradient-primary)" }}>
                      {i + 1}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{ach.title}</p>
                      {ach.description && <p className="text-sm text-muted-foreground mt-0.5">{ach.description}</p>}
                      {ach.year && <p className="text-xs text-muted-foreground mt-1">{ach.year}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Projects */}
        {profile.projects && profile.projects.length > 0 && (
          <Card className="mt-6">
            <CardHeader><CardTitle className="text-lg">Projects</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {profile.projects.map((proj, i) => (
                  <div key={i} className="p-3.5 rounded-lg bg-secondary/50 border border-border/50">
                    <p className="font-medium text-foreground">{proj.name}</p>
                    <p className="text-sm text-muted-foreground mt-0.5">{proj.description}</p>
                    {proj.url && <a href={proj.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline inline-flex items-center gap-1 mt-1"><ExternalLink className="h-3 w-3" />{proj.url}</a>}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default UserProfilePage;
