import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import ImageCropper from "@/components/ImageCropper";
import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/components/ui/sonner";
import {
  Pencil, Plus, X, Github, Linkedin, GraduationCap, Save, Camera, Loader2,
  MapPin, Phone, Globe, Trophy, BookOpen, Hash, Mail, Sparkles, ExternalLink,
  Languages, FileText, Twitter, CalendarDays, User, Upload, Download, Trash2,
  CheckCircle2, Circle,
} from "lucide-react";

interface ProjectItem { name: string; description: string; url?: string; }
interface AchievementItem { title: string; description: string; year?: string; }

const ProfilePage = () => {
  const { user } = useAuth();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [stats, setStats] = useState({ connections: 0, posts: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const resumeInputRef = useRef<HTMLInputElement>(null);
  const [uploadingResume, setUploadingResume] = useState(false);

  // Cropper state
  const [cropperOpen, setCropperOpen] = useState(false);
  const [cropperImage, setCropperImage] = useState("");
  const [cropperType, setCropperType] = useState<"avatar" | "cover">("avatar");

  const [profile, setProfile] = useState({
    full_name: "", username: "", bio: "", college: "", department: "", year_of_study: "",
    skills: [] as string[], projects: [] as ProjectItem[], linkedin_url: "", github_url: "",
    phone: "", location: "", interests: [] as string[], achievements: [] as AchievementItem[],
    portfolio_url: "", cgpa: "", enrollment_number: "",
    twitter_url: "", expected_graduation: "", languages: [] as string[],
    resume_url: "", about_me: "",
  });

  const [newSkill, setNewSkill] = useState("");
  const [newInterest, setNewInterest] = useState("");
  const [newLanguage, setNewLanguage] = useState("");
  const [newProject, setNewProject] = useState<ProjectItem>({ name: "", description: "", url: "" });
  const [newAchievement, setNewAchievement] = useState<AchievementItem>({ title: "", description: "", year: "" });

  useEffect(() => {
    if (!user) return;
    const fetchAll = async () => {
      const [{ data }, { count: connCount }, { count: postCount }] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", user.id).single(),
        supabase.from("connections").select("*", { count: "exact", head: true })
          .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`).eq("status", "accepted"),
        supabase.from("posts").select("*", { count: "exact", head: true }).eq("author_id", user.id),
      ]);
      if (data) {
        const d = data as any;
        setProfile({
          full_name: d.full_name || "", username: d.username || "", bio: d.bio || "",
          college: d.college || "", department: d.department || "", year_of_study: d.year_of_study || "",
          skills: d.skills || [], projects: (d.projects as ProjectItem[] | null) || [],
          linkedin_url: d.linkedin_url || "", github_url: d.github_url || "",
          phone: d.phone || "", location: d.location || "",
          interests: d.interests || [], achievements: (d.achievements as AchievementItem[] | null) || [],
          portfolio_url: d.portfolio_url || "", cgpa: d.cgpa || "", enrollment_number: d.enrollment_number || "",
          twitter_url: d.twitter_url || "", expected_graduation: d.expected_graduation || "",
          languages: d.languages || [], resume_url: d.resume_url || "", about_me: d.about_me || "",
        });
        setAvatarUrl(d.avatar_url || null);
        setCoverUrl(d.cover_url || null);
      }
      setStats({ connections: connCount || 0, posts: postCount || 0 });
      setLoading(false);
    };
    fetchAll();
  }, [user]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: "avatar" | "cover") => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be under 5MB"); return; }
    const url = URL.createObjectURL(file);
    setCropperImage(url);
    setCropperType(type);
    setCropperOpen(true);
    e.target.value = "";
  };

  const handleCroppedUpload = useCallback(async (blob: Blob) => {
    if (!user) return;
    const isAvatar = cropperType === "avatar";
    const bucket = isAvatar ? "avatars" : "cover-images";
    const path = `${user.id}/${isAvatar ? "avatar" : "cover"}.jpg`;
    const setUploading = isAvatar ? setUploadingAvatar : setUploadingCover;

    setCropperOpen(false);
    setUploading(true);

    const file = new File([blob], `${isAvatar ? "avatar" : "cover"}.jpg`, { type: "image/jpeg" });
    const { error: uploadErr } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
    if (uploadErr) { toast.error("Upload failed: " + uploadErr.message); setUploading(false); return; }

    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);
    const newUrl = urlData.publicUrl + "?t=" + Date.now();

    if (isAvatar) {
      const { error } = await supabase.from("profiles").update({ avatar_url: newUrl }).eq("user_id", user.id);
      if (error) toast.error("Failed to save avatar");
      else { setAvatarUrl(newUrl); toast.success("Avatar updated!"); }
    } else {
      const { error } = await supabase.from("profiles").update({ cover_url: newUrl } as any).eq("user_id", user.id);
      if (error) toast.error("Failed to save cover image");
      else { setCoverUrl(newUrl); toast.success("Cover image updated!"); }
    }
    setUploading(false);
  }, [user, cropperType]);

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 10 * 1024 * 1024) { toast.error("Resume must be under 10MB"); return; }
    if (file.type !== "application/pdf") { toast.error("Only PDF files are allowed"); return; }
    setUploadingResume(true);
    const path = `${user.id}/resume.pdf`;
    const { error: uploadErr } = await supabase.storage.from("resumes").upload(path, file, { upsert: true });
    if (uploadErr) { toast.error("Upload failed: " + uploadErr.message); setUploadingResume(false); return; }
    const { data: urlData } = supabase.storage.from("resumes").getPublicUrl(path);
    const newUrl = urlData.publicUrl + "?t=" + Date.now();
    const { error } = await supabase.from("profiles").update({ resume_url: newUrl } as any).eq("user_id", user.id);
    if (error) toast.error("Failed to save resume");
    else { setProfile((p) => ({ ...p, resume_url: newUrl })); toast.success("Resume uploaded!"); }
    setUploadingResume(false);
    e.target.value = "";
  };

  const handleResumeDelete = async () => {
    if (!user) return;
    setUploadingResume(true);
    await supabase.storage.from("resumes").remove([`${user.id}/resume.pdf`]);
    await supabase.from("profiles").update({ resume_url: "" } as any).eq("user_id", user.id);
    setProfile((p) => ({ ...p, resume_url: "" }));
    toast.success("Resume removed");
    setUploadingResume(false);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      full_name: profile.full_name, username: profile.username || null, bio: profile.bio,
      college: profile.college, department: profile.department, year_of_study: profile.year_of_study,
      skills: profile.skills, projects: profile.projects as any,
      linkedin_url: profile.linkedin_url, github_url: profile.github_url,
      phone: profile.phone, location: profile.location,
      interests: profile.interests, achievements: profile.achievements as any,
      portfolio_url: profile.portfolio_url, cgpa: profile.cgpa, enrollment_number: profile.enrollment_number,
      twitter_url: profile.twitter_url, expected_graduation: profile.expected_graduation,
      languages: profile.languages, resume_url: profile.resume_url, about_me: profile.about_me,
    } as any).eq("user_id", user.id);
    if (error) toast.error("Failed to save profile");
    else { toast.success("Profile updated!"); setEditing(false); }
    setSaving(false);
  };

  const addSkill = () => { if (newSkill.trim() && !profile.skills.includes(newSkill.trim())) { setProfile({ ...profile, skills: [...profile.skills, newSkill.trim()] }); setNewSkill(""); } };
  const addInterest = () => { if (newInterest.trim() && !profile.interests.includes(newInterest.trim())) { setProfile({ ...profile, interests: [...profile.interests, newInterest.trim()] }); setNewInterest(""); } };
  const addLanguage = () => { if (newLanguage.trim() && !profile.languages.includes(newLanguage.trim())) { setProfile({ ...profile, languages: [...profile.languages, newLanguage.trim()] }); setNewLanguage(""); } };
  const addProject = () => { if (newProject.name.trim()) { setProfile({ ...profile, projects: [...profile.projects, { ...newProject }] }); setNewProject({ name: "", description: "", url: "" }); } };
  const addAchievement = () => { if (newAchievement.title.trim()) { setProfile({ ...profile, achievements: [...profile.achievements, { ...newAchievement }] }); setNewAchievement({ title: "", description: "", year: "" }); } };

  if (!user) return <Layout><div className="container py-16 text-center"><p className="text-muted-foreground">Please sign in to view your profile.</p></div></Layout>;
  if (loading) return <Layout><div className="container py-16 flex justify-center"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div></Layout>;

  const initials = profile.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  const checklistItems = [
    { label: "Add your full name", done: !!profile.full_name },
    { label: "Write a short bio", done: !!profile.bio },
    { label: "Add a profile photo", done: !!avatarUrl },
    { label: "Set your college", done: !!profile.college },
    { label: "Set your department", done: !!profile.department },
    { label: "Add at least one skill", done: profile.skills.length > 0 },
    { label: "Add a social link (LinkedIn / GitHub)", done: !!(profile.linkedin_url || profile.github_url) },
    { label: "Write an About Me section", done: !!profile.about_me },
    { label: "Add interests & hobbies", done: profile.interests.length > 0 },
    { label: "Upload a resume", done: !!profile.resume_url },
    { label: "Add a project", done: profile.projects.length > 0 },
    { label: "Add a language", done: profile.languages.length > 0 },
  ];
  const completionFields = checklistItems.map((c) => c.done);
  const completion = Math.round((completionFields.filter(Boolean).length / completionFields.length) * 100);

  return (
    <Layout>
      <div className="container py-8 max-w-4xl">
        {/* Cover Banner */}
        <div className="relative h-40 md:h-56 rounded-t-2xl overflow-hidden group/cover" style={{ background: coverUrl ? undefined : "var(--gradient-primary)" }}>
          {coverUrl && <img src={coverUrl} alt="Cover" className="absolute inset-0 w-full h-full object-cover object-center" style={{ imageRendering: 'auto' }} />}
          <div className="absolute inset-0 bg-black/10" />
          <input ref={coverInputRef} type="file" accept="image/*" onChange={(e) => handleFileSelect(e, "cover")} className="hidden" />
          <button
            onClick={() => coverInputRef.current?.click()}
            disabled={uploadingCover}
            className="absolute top-4 left-4 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card/80 backdrop-blur-sm border border-white/20 text-foreground text-xs font-medium opacity-0 group-hover/cover:opacity-100 transition-opacity hover:bg-card"
          >
            {uploadingCover ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
            {uploadingCover ? "Uploading..." : coverUrl ? "Change Cover" : "Add Cover"}
          </button>
          <div className="absolute bottom-4 right-4 z-10">
            <Button
              variant={editing ? "default" : "outline"}
              onClick={editing ? handleSave : () => setEditing(true)}
              disabled={saving}
              className={editing ? "gradient-primary shadow-lg" : "bg-card/80 backdrop-blur-sm border-white/20 text-foreground hover:bg-card"}
            >
              {editing ? <><Save className="h-4 w-4 mr-1.5" />{saving ? "Saving..." : "Save Profile"}</> : <><Pencil className="h-4 w-4 mr-1.5" />Edit Profile</>}
            </Button>
          </div>
        </div>

        {/* Avatar + Basic Info Card — properly spaced below cover */}
        <Card className="rounded-t-none border-t-0 mb-6 relative">
          <CardContent className="pt-0 pb-6">
            {/* Avatar overlapping cover */}
            <div className="flex flex-col md:flex-row items-start gap-5">
              <div className="relative group -mt-16 z-10 shrink-0">
                <Avatar className="h-32 w-32 text-3xl border-4 border-card shadow-xl">
                  {avatarUrl && <AvatarImage src={avatarUrl} alt="Avatar" className="object-cover" style={{ imageRendering: 'auto' }} />}
                  <AvatarFallback className="gradient-primary text-primary-foreground text-4xl">{initials || "?"}</AvatarFallback>
                </Avatar>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={(e) => handleFileSelect(e, "avatar")} className="hidden" />
                <button onClick={() => fileInputRef.current?.click()} disabled={uploadingAvatar}
                  className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-0.5">
                  {uploadingAvatar ? <Loader2 className="h-6 w-6 text-white animate-spin" /> : (
                    <>
                      <Camera className="h-5 w-5 text-white" />
                      <span className="text-[10px] text-white font-medium">Change</span>
                    </>
                  )}
                </button>
              </div>

              <div className="flex-1 pt-4 md:pt-2 w-full min-w-0">
                {editing ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div><Label>Full Name</Label><Input value={profile.full_name} onChange={(e) => setProfile({ ...profile, full_name: e.target.value })} /></div>
                      <div><Label>Username</Label><Input value={profile.username} onChange={(e) => setProfile({ ...profile, username: e.target.value })} placeholder="@username" /></div>
                    </div>
                    <div><Label>Bio (short tagline)</Label><Input value={profile.bio} onChange={(e) => setProfile({ ...profile, bio: e.target.value })} placeholder="e.g., Full-Stack Developer | ML Enthusiast" /></div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div><Label className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" />Phone</Label><Input value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} placeholder="+91 9876543210" /></div>
                      <div><Label className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />Location</Label><Input value={profile.location} onChange={(e) => setProfile({ ...profile, location: e.target.value })} placeholder="City, State" /></div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3 flex-wrap">
                      <h1 className="text-2xl md:text-3xl font-bold text-foreground">{profile.full_name || "Your Name"}</h1>
                      {profile.username && <Badge variant="secondary" className="text-sm">@{profile.username}</Badge>}
                    </div>
                    <p className="text-muted-foreground mt-1.5 max-w-xl">{profile.bio || "No bio yet — tell the world about yourself!"}</p>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{user.email}</span>
                      {profile.phone && <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{profile.phone}</span>}
                      {profile.location && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{profile.location}</span>}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Stats Bar */}
            <div className="grid grid-cols-3 gap-4 mt-6 pt-5 border-t border-border">
              <div className="text-center"><p className="text-2xl font-bold text-foreground">{stats.connections}</p><p className="text-xs text-muted-foreground">Connections</p></div>
              <div className="text-center"><p className="text-2xl font-bold text-foreground">{stats.posts}</p><p className="text-xs text-muted-foreground">Posts</p></div>
              <div className="text-center"><p className="text-2xl font-bold text-foreground">{completion}%</p><p className="text-xs text-muted-foreground">Profile Complete</p></div>
            </div>
             {completion < 100 && !editing && (
              <div className="mt-4 space-y-3">
                <div className="w-full bg-secondary rounded-full h-2">
                  <div className="h-2 rounded-full transition-all duration-500" style={{ width: `${completion}%`, background: "var(--gradient-primary)" }} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {checklistItems.map((item) => (
                    <div key={item.label} className={`flex items-center gap-2 text-xs px-2 py-1.5 rounded-md transition-colors ${item.done ? "text-muted-foreground" : "text-foreground bg-secondary/50"}`}>
                      {item.done ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                      ) : (
                        <Circle className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
                      )}
                      <span className={item.done ? "line-through" : "font-medium"}>{item.label}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground flex items-center gap-1"><Sparkles className="h-3 w-3" />Complete your profile to stand out!</p>
              </div>
             )}
          </CardContent>
        </Card>

        {/* About Me */}
        <Card className="mb-6">
          <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><User className="h-5 w-5 text-primary" />About Me</CardTitle></CardHeader>
          <CardContent>
            {editing ? (
              <Textarea value={profile.about_me} onChange={(e) => setProfile({ ...profile, about_me: e.target.value })}
                placeholder="Write a detailed description about yourself, your goals, what you're looking for..." rows={5} />
            ) : (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{profile.about_me || "No detailed description yet. Click Edit to add one!"}</p>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Academic Info */}
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><GraduationCap className="h-5 w-5 text-primary" />Academic Info</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {editing ? (
                <>
                  <div><Label>College / University</Label><Input value={profile.college} onChange={(e) => setProfile({ ...profile, college: e.target.value })} placeholder="e.g., IIT Delhi" /></div>
                  <div><Label>Department / Branch</Label><Input value={profile.department} onChange={(e) => setProfile({ ...profile, department: e.target.value })} placeholder="e.g., Computer Science" /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Year of Study</Label><Input value={profile.year_of_study} onChange={(e) => setProfile({ ...profile, year_of_study: e.target.value })} placeholder="e.g., 3rd Year" /></div>
                    <div><Label>CGPA / %</Label><Input value={profile.cgpa} onChange={(e) => setProfile({ ...profile, cgpa: e.target.value })} placeholder="e.g., 8.5" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label className="flex items-center gap-1"><Hash className="h-3.5 w-3.5" />Enrollment No.</Label><Input value={profile.enrollment_number} onChange={(e) => setProfile({ ...profile, enrollment_number: e.target.value })} placeholder="e.g., 2023CSE001" /></div>
                     <div>
                       <Label className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />Expected Graduation</Label>
                       <div className="flex gap-2 mt-1">
                         <select
                           value={profile.expected_graduation?.split(" ")[0] || ""}
                           onChange={(e) => {
                             const year = profile.expected_graduation?.split(" ")[1] || "";
                             setProfile({ ...profile, expected_graduation: `${e.target.value} ${year}`.trim() });
                           }}
                           className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                         >
                           <option value="">Month</option>
                           {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((m) => (
                             <option key={m} value={m}>{m}</option>
                           ))}
                         </select>
                         <select
                           value={profile.expected_graduation?.split(" ")[1] || ""}
                           onChange={(e) => {
                             const month = profile.expected_graduation?.split(" ")[0] || "";
                             setProfile({ ...profile, expected_graduation: `${month} ${e.target.value}`.trim() });
                           }}
                           className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                         >
                           <option value="">Year</option>
                           {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() + i).map((y) => (
                             <option key={y} value={y}>{y}</option>
                           ))}
                         </select>
                       </div>
                     </div>
                  </div>
                </>
              ) : (
                <div className="space-y-2.5 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">College</span><span className="text-foreground font-medium text-right max-w-[60%] truncate">{profile.college || "—"}</span></div>
                  <Separator />
                  <div className="flex justify-between"><span className="text-muted-foreground">Department</span><span className="text-foreground font-medium text-right max-w-[60%] truncate">{profile.department || "—"}</span></div>
                  <Separator />
                  <div className="flex justify-between"><span className="text-muted-foreground">Year</span><span className="text-foreground font-medium">{profile.year_of_study || "—"}</span></div>
                  <Separator />
                  <div className="flex justify-between"><span className="text-muted-foreground">CGPA</span><span className="text-foreground font-medium">{profile.cgpa || "—"}</span></div>
                  {profile.enrollment_number && <><Separator /><div className="flex justify-between"><span className="text-muted-foreground">Enrollment No.</span><span className="text-foreground font-medium">{profile.enrollment_number}</span></div></>}
                  {profile.expected_graduation && <><Separator /><div className="flex justify-between"><span className="text-muted-foreground">Expected Graduation</span><span className="text-foreground font-medium">{profile.expected_graduation}</span></div></>}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Social & Links */}
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Globe className="h-5 w-5 text-primary" />Links & Socials</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {editing ? (
                <>
                  <div><Label className="flex items-center gap-1"><Linkedin className="h-3.5 w-3.5" />LinkedIn</Label><Input value={profile.linkedin_url} onChange={(e) => setProfile({ ...profile, linkedin_url: e.target.value })} placeholder="https://linkedin.com/in/..." /></div>
                  <div><Label className="flex items-center gap-1"><Github className="h-3.5 w-3.5" />GitHub</Label><Input value={profile.github_url} onChange={(e) => setProfile({ ...profile, github_url: e.target.value })} placeholder="https://github.com/..." /></div>
                  <div><Label className="flex items-center gap-1"><Twitter className="h-3.5 w-3.5" />Twitter / X</Label><Input value={profile.twitter_url} onChange={(e) => setProfile({ ...profile, twitter_url: e.target.value })} placeholder="https://twitter.com/..." /></div>
                  <div><Label className="flex items-center gap-1"><Globe className="h-3.5 w-3.5" />Portfolio</Label><Input value={profile.portfolio_url} onChange={(e) => setProfile({ ...profile, portfolio_url: e.target.value })} placeholder="https://yourportfolio.com" /></div>
                  <div>
                    <Label className="flex items-center gap-1"><FileText className="h-3.5 w-3.5" />Resume (PDF)</Label>
                    <input ref={resumeInputRef} type="file" accept=".pdf,application/pdf" className="hidden" onChange={handleResumeUpload} />
                    {profile.resume_url ? (
                      <div className="flex items-center gap-2 mt-1.5">
                        <a href={profile.resume_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm text-primary hover:underline flex-1 truncate">
                          <FileText className="h-3.5 w-3.5 shrink-0" />Resume uploaded
                        </a>
                        <Button type="button" variant="outline" size="sm" onClick={() => resumeInputRef.current?.click()} disabled={uploadingResume}>
                          {uploadingResume ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                        </Button>
                        <Button type="button" variant="outline" size="sm" onClick={handleResumeDelete} disabled={uploadingResume}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    ) : (
                      <Button type="button" variant="outline" className="w-full mt-1.5" onClick={() => resumeInputRef.current?.click()} disabled={uploadingResume}>
                        {uploadingResume ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                        Upload Resume (PDF)
                      </Button>
                    )}
                  </div>
                </>
              ) : (
                <div className="space-y-2.5">
                  {[
                    { url: profile.linkedin_url, icon: Linkedin, label: "LinkedIn" },
                    { url: profile.github_url, icon: Github, label: "GitHub" },
                    { url: profile.twitter_url, icon: Twitter, label: "Twitter / X" },
                    { url: profile.portfolio_url, icon: Globe, label: "Portfolio" },
                    { url: profile.resume_url, icon: FileText, label: "Resume" },
                  ].filter((l) => l.url).map((link) => (
                    <a key={link.label} href={link.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 p-2.5 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors text-sm text-foreground">
                      <link.icon className="h-4 w-4 text-primary" /><span className="flex-1">{link.label}</span><ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                    </a>
                  ))}
                  {!profile.linkedin_url && !profile.github_url && !profile.portfolio_url && !profile.twitter_url && !profile.resume_url && (
                    <p className="text-sm text-muted-foreground">No links added yet</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Skills */}
        <Card className="mt-6">
          <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><BookOpen className="h-5 w-5 text-primary" />Skills</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2 mb-3">
              {profile.skills.length === 0 && !editing && <p className="text-sm text-muted-foreground">No skills added yet</p>}
              {profile.skills.map((skill) => (
                <Badge key={skill} variant="secondary" className="gap-1 px-3 py-1">
                  {skill}
                  {editing && <button onClick={() => setProfile({ ...profile, skills: profile.skills.filter((s) => s !== skill) })}><X className="h-3 w-3" /></button>}
                </Badge>
              ))}
            </div>
            {editing && (
              <div className="flex gap-2">
                <Input value={newSkill} onChange={(e) => setNewSkill(e.target.value)} placeholder="Add a skill (e.g., React, Python)..." onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSkill())} />
                <Button variant="outline" size="icon" onClick={addSkill}><Plus className="h-4 w-4" /></Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Languages */}
        <Card className="mt-6">
          <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Languages className="h-5 w-5 text-primary" />Languages</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2 mb-3">
              {profile.languages.length === 0 && !editing && <p className="text-sm text-muted-foreground">No languages added yet</p>}
               {profile.languages.map((lang) => (
                <Badge key={lang} className="gap-1.5 px-3 py-1.5 bg-primary/10 text-primary border border-primary/20 hover:bg-primary/15">
                   <Globe className="h-3 w-3" />
                   {lang}
                   {editing && <button onClick={() => setProfile({ ...profile, languages: profile.languages.filter((l) => l !== lang) })}><X className="h-3 w-3 hover:text-destructive" /></button>}
                </Badge>
               ))}
            </div>
            {editing && (
              <div className="flex gap-2">
                <Input value={newLanguage} onChange={(e) => setNewLanguage(e.target.value)} placeholder="Add a language (e.g., Hindi, English)..." onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addLanguage())} />
                <Button variant="outline" size="icon" onClick={addLanguage}><Plus className="h-4 w-4" /></Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Interests & Hobbies */}
        <Card className="mt-6">
          <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Sparkles className="h-5 w-5 text-primary" />Interests & Hobbies</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2 mb-3">
              {profile.interests.length === 0 && !editing && <p className="text-sm text-muted-foreground">No interests added yet</p>}
              {profile.interests.map((interest) => (
                <Badge key={interest} className="gap-1 px-3 py-1 bg-accent/15 text-accent-foreground border border-accent/30 hover:bg-accent/25">
                  {interest}
                  {editing && <button onClick={() => setProfile({ ...profile, interests: profile.interests.filter((i) => i !== interest) })}><X className="h-3 w-3" /></button>}
                </Badge>
              ))}
            </div>
            {editing && (
              <div className="flex gap-2">
                <Input value={newInterest} onChange={(e) => setNewInterest(e.target.value)} placeholder="Add an interest (e.g., AI/ML, Music)..." onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addInterest())} />
                <Button variant="outline" size="icon" onClick={addInterest}><Plus className="h-4 w-4" /></Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Achievements */}
        <Card className="mt-6">
          <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Trophy className="h-5 w-5 text-primary" />Achievements & Certifications</CardTitle></CardHeader>
          <CardContent>
            {profile.achievements.length === 0 && !editing && <p className="text-sm text-muted-foreground">No achievements added yet</p>}
            <div className="space-y-3">
              {profile.achievements.map((ach, i) => (
                <div key={i} className="p-3.5 rounded-lg bg-secondary/50 flex justify-between items-start border border-border/50">
                  <div className="flex gap-3 items-start">
                    <div className="h-8 w-8 rounded-full flex items-center justify-center shrink-0 text-primary-foreground text-xs font-bold" style={{ background: "var(--gradient-primary)" }}>{i + 1}</div>
                    <div>
                      <p className="font-medium text-foreground">{ach.title}</p>
                      {ach.description && <p className="text-sm text-muted-foreground mt-0.5">{ach.description}</p>}
                      {ach.year && <p className="text-xs text-muted-foreground mt-1">{ach.year}</p>}
                    </div>
                  </div>
                  {editing && <button onClick={() => setProfile({ ...profile, achievements: profile.achievements.filter((_, idx) => idx !== i) })}><X className="h-4 w-4 text-muted-foreground hover:text-destructive" /></button>}
                </div>
              ))}
            </div>
            {editing && (
              <div className="mt-4 p-4 rounded-lg border border-dashed space-y-3">
                <Input value={newAchievement.title} onChange={(e) => setNewAchievement({ ...newAchievement, title: e.target.value })} placeholder="Achievement / Certification title" />
                <Input value={newAchievement.description} onChange={(e) => setNewAchievement({ ...newAchievement, description: e.target.value })} placeholder="Short description (optional)" />
                <Input value={newAchievement.year || ""} onChange={(e) => setNewAchievement({ ...newAchievement, year: e.target.value })} placeholder="Year (e.g., 2025)" />
                <Button variant="outline" onClick={addAchievement} disabled={!newAchievement.title.trim()}><Plus className="h-4 w-4 mr-1" />Add Achievement</Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Projects */}
        <Card className="mt-6">
          <CardHeader><CardTitle className="text-lg">Projects</CardTitle></CardHeader>
          <CardContent>
            {profile.projects.length === 0 && !editing && <p className="text-sm text-muted-foreground">No projects added yet</p>}
            <div className="space-y-3">
              {profile.projects.map((proj, i) => (
                <div key={i} className="p-3.5 rounded-lg bg-secondary/50 flex justify-between items-start border border-border/50">
                  <div>
                    <p className="font-medium text-foreground">{proj.name}</p>
                    <p className="text-sm text-muted-foreground mt-0.5">{proj.description}</p>
                    {proj.url && <a href={proj.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline inline-flex items-center gap-1 mt-1"><ExternalLink className="h-3 w-3" />{proj.url}</a>}
                  </div>
                  {editing && <button onClick={() => setProfile({ ...profile, projects: profile.projects.filter((_, idx) => idx !== i) })}><X className="h-4 w-4 text-muted-foreground hover:text-destructive" /></button>}
                </div>
              ))}
            </div>
            {editing && (
              <div className="mt-4 p-4 rounded-lg border border-dashed space-y-3">
                <Input value={newProject.name} onChange={(e) => setNewProject({ ...newProject, name: e.target.value })} placeholder="Project name" />
                <Input value={newProject.description} onChange={(e) => setNewProject({ ...newProject, description: e.target.value })} placeholder="Short description" />
                <Input value={newProject.url} onChange={(e) => setNewProject({ ...newProject, url: e.target.value })} placeholder="Project URL (optional)" />
                <Button variant="outline" onClick={addProject} disabled={!newProject.name.trim()}><Plus className="h-4 w-4 mr-1" />Add Project</Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

        {/* Image Cropper */}
        <ImageCropper
          open={cropperOpen}
          imageSrc={cropperImage}
          aspect={cropperType === "avatar" ? 1 : 3}
          cropShape={cropperType === "avatar" ? "round" : "rect"}
          onClose={() => { setCropperOpen(false); URL.revokeObjectURL(cropperImage); }}
          onCropComplete={handleCroppedUpload}
        />
    </Layout>
  );
};

export default ProfilePage;
