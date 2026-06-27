
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Search, Upload, Download, ThumbsUp, FileText, File, Image as ImageIcon, Trash2, Filter, BookOpen } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";

const SUBJECTS = ["General", "Mathematics", "Physics", "Chemistry", "Computer Science", "Electronics", "Mechanical", "Civil", "Electrical", "Biology", "English", "Economics", "Other"];
const CATEGORIES = ["Notes", "Past Papers", "Assignments", "Lab Reports", "Presentations", "Books", "Cheat Sheets", "Other"];
const SEMESTERS = ["", "1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th"];

interface Resource {
  id: string;
  uploader_id: string;
  title: string;
  description: string;
  subject: string;
  category: string;
  semester: string;
  file_url: string;
  file_name: string;
  file_size: number;
  file_type: string;
  downloads: number;
  upvotes: number;
  created_at: string;
  uploader?: { full_name: string; avatar_url: string | null; college: string | null };
  user_voted?: boolean;
}

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getFileIcon = (type: string) => {
  if (type.startsWith("image/")) return <ImageIcon className="h-5 w-5" />;
  if (type === "application/pdf") return <FileText className="h-5 w-5" />;
  return <File className="h-5 w-5" />;
};

const ResourcesPage = () => {
  const { user } = useAuth();
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSubject, setFilterSubject] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Upload form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [subject, setSubject] = useState("General");
  const [category, setCategory] = useState("Notes");
  const [semester, setSemester] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const fetchResources = useCallback(async () => {
    setLoading(true);
    let query = supabase.from("resources").select("*").order("created_at", { ascending: false });

    if (filterSubject !== "all") query = query.eq("subject", filterSubject);
    if (filterCategory !== "all") query = query.eq("category", filterCategory);
    if (searchQuery.trim()) query = query.ilike("title", `%${searchQuery.trim()}%`);

    const { data, error } = await query;
    if (error) { setLoading(false); return; }

    // Fetch uploader profiles and user votes
    const uploaderIds = [...new Set((data || []).map(r => r.uploader_id))];
    const [{ data: profiles }, { data: votes }] = await Promise.all([
      uploaderIds.length > 0 ? supabase.from("profiles").select("user_id, full_name, avatar_url, college").in("user_id", uploaderIds) : { data: [] },
      user ? supabase.from("resource_votes").select("resource_id").eq("user_id", user.id) : { data: [] },
    ]);

    const profileMap: Record<string, any> = {};
    (profiles || []).forEach(p => { profileMap[p.user_id] = p; });
    const votedSet = new Set((votes || []).map((v: any) => v.resource_id));

    const enriched = (data || []).map(r => ({
      ...r,
      uploader: profileMap[r.uploader_id],
      user_voted: votedSet.has(r.id),
    }));

    setResources(enriched);
    setLoading(false);
  }, [filterSubject, filterCategory, searchQuery, user]);

  useEffect(() => { fetchResources(); }, [fetchResources]);

  const handleUpload = async () => {
    if (!user || !file || !title.trim()) {
      toast({ title: "Title aur file dono required hain", variant: "destructive" });
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast({ title: "File size 20MB se zyada nahi ho sakti", variant: "destructive" });
      return;
    }

    setUploading(true);
    const fileExt = file.name.split(".").pop();
    const filePath = `${user.id}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage.from("resources").upload(filePath, file);
    if (uploadError) {
      toast({ title: "File upload failed", description: uploadError.message, variant: "destructive" });
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("resources").getPublicUrl(filePath);

    const { error: insertError } = await supabase.from("resources").insert({
      uploader_id: user.id,
      title: title.trim(),
      description: description.trim(),
      subject,
      category,
      semester,
      file_url: urlData.publicUrl,
      file_name: file.name,
      file_size: file.size,
      file_type: file.type,
    });

    if (insertError) {
      toast({ title: "Resource save failed", description: insertError.message, variant: "destructive" });
    } else {
      toast({ title: "Resource uploaded successfully! 🎉" });
      setTitle(""); setDescription(""); setSubject("General"); setCategory("Notes"); setSemester(""); setFile(null);
      setUploadOpen(false);
      fetchResources();
    }
    setUploading(false);
  };

  const handleVote = async (resourceId: string, userVoted: boolean) => {
    if (!user) return;
    if (userVoted) {
      await supabase.from("resource_votes").delete().eq("resource_id", resourceId).eq("user_id", user.id);
      await supabase.from("resources").update({ upvotes: Math.max(0, (resources.find(r => r.id === resourceId)?.upvotes || 1) - 1) }).eq("id", resourceId);
    } else {
      await supabase.from("resource_votes").insert({ resource_id: resourceId, user_id: user.id });
      await supabase.from("resources").update({ upvotes: (resources.find(r => r.id === resourceId)?.upvotes || 0) + 1 }).eq("id", resourceId);
    }
    fetchResources();
  };

  const handleDownload = async (resource: Resource) => {
    window.open(resource.file_url, "_blank");
    // Increment download count (best effort, uploader can update their own)
    await supabase.from("resources").update({ downloads: resource.downloads + 1 }).eq("id", resource.id);
    setResources(prev => prev.map(r => r.id === resource.id ? { ...r, downloads: r.downloads + 1 } : r));
  };

  const handleDelete = async (resourceId: string) => {
    const { error } = await supabase.from("resources").delete().eq("id", resourceId);
    if (!error) {
      toast({ title: "Resource deleted" });
      setResources(prev => prev.filter(r => r.id !== resourceId));
    }
  };

  return (
    <Layout>
      <div className="container max-w-5xl py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <BookOpen className="h-7 w-7 text-primary" />
              Resource Library
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Notes, past papers, assignments — sab kuch yahan milega</p>
          </div>
          <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-primary gap-2">
                <Upload className="h-4 w-4" /> Upload Resource
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Upload New Resource</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div>
                  <Label>Title *</Label>
                  <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Data Structures Notes Unit 1" />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Brief description..." rows={2} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Subject</Label>
                    <Select value={subject} onValueChange={setSubject}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{SUBJECTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Category</Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Semester (optional)</Label>
                  <Select value={semester} onValueChange={setSemester}>
                    <SelectTrigger><SelectValue placeholder="Select semester" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value=" ">None</SelectItem>
                      {SEMESTERS.filter(Boolean).map(s => <SelectItem key={s} value={s}>{s} Semester</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>File * (Max 20MB)</Label>
                  <Input type="file" onChange={e => setFile(e.target.files?.[0] || null)} accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.jpg,.jpeg,.png,.zip" />
                  {file && <p className="text-xs text-muted-foreground mt-1">{file.name} — {formatFileSize(file.size)}</p>}
                </div>
                <Button onClick={handleUpload} disabled={uploading || !title.trim() || !file} className="w-full gradient-primary">
                  {uploading ? "Uploading..." : "Upload"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search resources..." className="pl-10" />
          </div>
          <Select value={filterSubject} onValueChange={setFilterSubject}>
            <SelectTrigger className="w-full sm:w-44">
              <Filter className="h-4 w-4 mr-2" /><SelectValue placeholder="Subject" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Subjects</SelectItem>
              {SUBJECTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Resource List */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : resources.length === 0 ? (
          <div className="text-center py-20">
            <BookOpen className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-lg font-medium text-muted-foreground">Koi resource nahi mila</p>
            <p className="text-sm text-muted-foreground">Pehle resource upload karo ya filters change karo</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {resources.map(r => (
              <Card key={r.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    {/* File icon */}
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 text-primary">
                      {getFileIcon(r.file_type)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-semibold text-foreground line-clamp-1">{r.title}</h3>
                          {r.description && <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">{r.description}</p>}
                        </div>
                        {user?.id === r.uploader_id && (
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(r.id)} className="shrink-0 text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>

                      {/* Badges */}
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        <Badge variant="secondary">{r.subject}</Badge>
                        <Badge variant="outline">{r.category}</Badge>
                        {r.semester && <Badge variant="outline">{r.semester} Sem</Badge>}
                        <Badge variant="outline" className="text-xs">{formatFileSize(r.file_size)}</Badge>
                      </div>

                      {/* Footer */}
                      <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            {r.uploader?.avatar_url && <AvatarImage src={r.uploader.avatar_url} />}
                            <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                              {r.uploader?.full_name?.charAt(0) || "?"}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs text-muted-foreground">
                            {r.uploader?.full_name || "Unknown"} · {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleVote(r.id, !!r.user_voted)}
                            className={`gap-1 h-8 ${r.user_voted ? "text-primary" : "text-muted-foreground"}`}
                          >
                            <ThumbsUp className="h-3.5 w-3.5" />
                            <span className="text-xs">{r.upvotes}</span>
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDownload(r)} className="gap-1 h-8 text-muted-foreground">
                            <Download className="h-3.5 w-3.5" />
                            <span className="text-xs">{r.downloads}</span>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ResourcesPage;
