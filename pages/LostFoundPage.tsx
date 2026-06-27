import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";
import { formatDistanceToNow } from "date-fns";
import {
  Search as SearchIcon,
  Plus,
  MapPin,
  Calendar as CalendarIcon,
  MessageSquare,
  CheckCircle2,
  PackageSearch,
  Trash2,
  Image as ImageIcon,
  X,
  Send,
} from "lucide-react";

const CATEGORIES = ["Electronics", "Books", "ID Card", "Clothing", "Accessories", "Keys", "Other"] as const;

interface Item {
  id: string;
  user_id: string;
  type: "lost" | "found";
  title: string;
  description: string;
  image_url: string | null;
  location: string;
  item_date: string | null;
  category: string;
  status: "open" | "resolved";
  created_at: string;
  author?: { full_name: string; avatar_url: string | null };
}

interface Comment {
  id: string;
  item_id: string;
  author_id: string;
  content: string;
  created_at: string;
  author?: { full_name: string; avatar_url: string | null };
}

const LostFoundPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"all" | "lost" | "found">("all");
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("All");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // form
  const [type, setType] = useState<"lost" | "found">("lost");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [itemDate, setItemDate] = useState("");
  const [category, setCategory] = useState<string>("Other");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // detail view
  const [selected, setSelected] = useState<Item | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");

  useEffect(() => {
    fetchItems();
    const channel = supabase
      .channel("lost-found-items")
      .on("postgres_changes", { event: "*", schema: "public", table: "lost_found_items" }, () => fetchItems())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchItems = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("lost_found_items")
      .select("*")
      .order("created_at", { ascending: false });

    if (data?.length) {
      const userIds = [...new Set(data.map((d) => d.user_id))];
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .in("user_id", userIds);
      const map: Record<string, { full_name: string; avatar_url: string | null }> = {};
      (profs || []).forEach((p) => { map[p.user_id] = p; });
      setItems(data.map((d) => ({ ...d, author: map[d.user_id] })) as Item[]);
    } else {
      setItems([]);
    }
    setLoading(false);
  };

  const fetchComments = async (itemId: string) => {
    const { data } = await supabase
      .from("lost_found_comments")
      .select("*")
      .eq("item_id", itemId)
      .order("created_at", { ascending: true });
    if (data?.length) {
      const userIds = [...new Set(data.map((d) => d.author_id))];
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .in("user_id", userIds);
      const map: Record<string, { full_name: string; avatar_url: string | null }> = {};
      (profs || []).forEach((p) => { map[p.user_id] = p; });
      setComments(data.map((d) => ({ ...d, author: map[d.author_id] })) as Comment[]);
    } else {
      setComments([]);
    }
  };

  const openDetail = async (item: Item) => {
    setSelected(item);
    await fetchComments(item.id);
  };

  const resetForm = () => {
    setType("lost");
    setTitle("");
    setDescription("");
    setLocation("");
    setItemDate("");
    setCategory("Other");
    setImageFile(null);
    setImagePreview(null);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }
    setImageFile(f);
    setImagePreview(URL.createObjectURL(f));
  };

  const handleSubmit = async () => {
    if (!user) return;
    if (!title.trim()) { toast.error("Title required"); return; }
    setSubmitting(true);

    let image_url: string | null = null;
    if (imageFile) {
      const ext = imageFile.name.split(".").pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("lost-found-images")
        .upload(path, imageFile);
      if (upErr) {
        toast.error("Image upload failed");
        setSubmitting(false);
        return;
      }
      const { data: pub } = supabase.storage.from("lost-found-images").getPublicUrl(path);
      image_url = pub.publicUrl;
    }

    const { error } = await supabase.from("lost_found_items").insert({
      user_id: user.id,
      type,
      title: title.trim(),
      description: description.trim(),
      location: location.trim(),
      item_date: itemDate || null,
      category,
      image_url,
      status: "open",
    });

    setSubmitting(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Posted!");
      resetForm();
      setDialogOpen(false);
      fetchItems();
    }
  };

  const toggleStatus = async (item: Item) => {
    const newStatus = item.status === "open" ? "resolved" : "open";
    await supabase.from("lost_found_items").update({ status: newStatus }).eq("id", item.id);
    toast.success(newStatus === "resolved" ? "Marked as resolved" : "Reopened");
    if (selected?.id === item.id) setSelected({ ...item, status: newStatus });
    fetchItems();
  };

  const deleteItem = async (item: Item) => {
    if (!confirm("Delete this post?")) return;
    await supabase.from("lost_found_items").delete().eq("id", item.id);
    toast.success("Deleted");
    if (selected?.id === item.id) setSelected(null);
    fetchItems();
  };

  const addComment = async () => {
    if (!user || !selected || !commentText.trim()) return;
    const { error } = await supabase.from("lost_found_comments").insert({
      item_id: selected.id,
      author_id: user.id,
      content: commentText.trim(),
    });
    if (error) { toast.error(error.message); return; }
    setCommentText("");
    fetchComments(selected.id);
  };

  const deleteComment = async (id: string) => {
    await supabase.from("lost_found_comments").delete().eq("id", id);
    if (selected) fetchComments(selected.id);
  };

  const startDM = async (otherUserId: string) => {
    if (!user || otherUserId === user.id) return;
    const { data: myConvos } = await supabase
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", user.id);

    if (myConvos?.length) {
      const ids = myConvos.map((c) => c.conversation_id);
      const { data: shared } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", otherUserId)
        .in("conversation_id", ids);
      if (shared?.length) {
        navigate("/messages");
        return;
      }
    }
    const { data: convo } = await supabase.from("conversations").insert({}).select().single();
    if (convo) {
      await supabase.from("conversation_participants").insert([
        { conversation_id: convo.id, user_id: user.id },
        { conversation_id: convo.id, user_id: otherUserId },
      ]);
      navigate("/messages");
    }
  };

  const filtered = items.filter((i) => {
    if (tab !== "all" && i.type !== tab) return false;
    if (filterCategory !== "All" && i.category !== filterCategory) return false;
    if (search.trim()) {
      const s = search.toLowerCase();
      if (
        !i.title.toLowerCase().includes(s) &&
        !i.description.toLowerCase().includes(s) &&
        !i.location.toLowerCase().includes(s)
      ) return false;
    }
    return true;
  });

  return (
    <Layout>
      <div className="container py-6 max-w-6xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <PackageSearch className="h-6 w-6 text-primary" />
              Lost &amp; Found
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Lost something on campus or found someone&apos;s item? Post it here.
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="gradient-primary gap-2"><Plus className="h-4 w-4" /> Post Item</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Post Lost / Found Item</DialogTitle></DialogHeader>
              <div className="space-y-3 py-2">
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={type === "lost" ? "default" : "outline"}
                    className={type === "lost" ? "gradient-primary" : ""}
                    onClick={() => setType("lost")}
                  >
                    I Lost This
                  </Button>
                  <Button
                    type="button"
                    variant={type === "found" ? "default" : "outline"}
                    className={type === "found" ? "gradient-primary" : ""}
                    onClick={() => setType("found")}
                  >
                    I Found This
                  </Button>
                </div>

                <div>
                  <Label>Title *</Label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Black wallet, Calculus textbook" maxLength={100} />
                </div>

                <div>
                  <Label>Description</Label>
                  <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Color, brand, distinguishing marks..." rows={3} maxLength={500} />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Category</Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Date {type === "lost" ? "lost" : "found"}</Label>
                    <Input type="date" value={itemDate} onChange={(e) => setItemDate(e.target.value)} />
                  </div>
                </div>

                <div>
                  <Label>Location</Label>
                  <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Library 2nd floor, Block B canteen" maxLength={150} />
                </div>

                <div>
                  <Label>Photo (optional)</Label>
                  {imagePreview ? (
                    <div className="relative mt-1">
                      <img src={imagePreview} alt="preview" className="w-full h-40 object-cover rounded-lg" />
                      <button
                        type="button"
                        onClick={() => { setImageFile(null); setImagePreview(null); }}
                        className="absolute top-2 right-2 bg-background/80 rounded-full p-1"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="mt-1 flex items-center justify-center gap-2 border-2 border-dashed rounded-lg py-6 cursor-pointer hover:bg-accent/50">
                      <ImageIcon className="h-5 w-5 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Click to upload</span>
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                    </label>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleSubmit} disabled={submitting} className="gradient-primary">
                  {submitting ? "Posting..." : "Post"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search items, locations..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-full sm:w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Categories</SelectItem>
              {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="mb-5">
          <TabsList>
            <TabsTrigger value="all">All ({items.length})</TabsTrigger>
            <TabsTrigger value="lost">Lost ({items.filter((i) => i.type === "lost").length})</TabsTrigger>
            <TabsTrigger value="found">Found ({items.filter((i) => i.type === "found").length})</TabsTrigger>
          </TabsList>
        </Tabs>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : filtered.length === 0 ? (
          <Card><CardContent className="py-16 text-center">
            <PackageSearch className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground">No items match. Be the first to post!</p>
          </CardContent></Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((item) => (
              <Card
                key={item.id}
                className="overflow-hidden cursor-pointer hover:shadow-lg transition-all"
                onClick={() => openDetail(item)}
              >
                {item.image_url && (
                  <div className="aspect-video bg-muted overflow-hidden">
                    <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" />
                  </div>
                )}
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <Badge
                      variant={item.type === "lost" ? "destructive" : "default"}
                      className={item.type === "found" ? "bg-primary/15 text-primary border-primary/20" : ""}
                    >
                      {item.type === "lost" ? "Lost" : "Found"}
                    </Badge>
                    {item.status === "resolved" && (
                      <Badge variant="secondary" className="gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Resolved
                      </Badge>
                    )}
                  </div>
                  <h3 className="font-semibold text-foreground line-clamp-1">{item.title}</h3>
                  {item.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>
                  )}
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground pt-1">
                    {item.location && (
                      <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{item.location}</span>
                    )}
                    {item.item_date && (
                      <span className="flex items-center gap-1"><CalendarIcon className="h-3 w-3" />{item.item_date}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 pt-2 border-t">
                    <Avatar className="h-6 w-6">
                      {item.author?.avatar_url && <AvatarImage src={item.author.avatar_url} />}
                      <AvatarFallback className="text-[10px]">{item.author?.full_name?.[0] || "?"}</AvatarFallback>
                    </Avatar>
                    <span className="text-xs text-muted-foreground truncate flex-1">
                      {item.author?.full_name || "Unknown"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Detail dialog */}
        <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            {selected && (
              <>
                <DialogHeader>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge
                      variant={selected.type === "lost" ? "destructive" : "default"}
                      className={selected.type === "found" ? "bg-primary/15 text-primary border-primary/20" : ""}
                    >
                      {selected.type === "lost" ? "Lost" : "Found"}
                    </Badge>
                    <Badge variant="outline">{selected.category}</Badge>
                    {selected.status === "resolved" && (
                      <Badge variant="secondary" className="gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Resolved
                      </Badge>
                    )}
                  </div>
                  <DialogTitle className="text-left">{selected.title}</DialogTitle>
                </DialogHeader>

                {selected.image_url && (
                  <img src={selected.image_url} alt={selected.title} className="w-full max-h-80 object-cover rounded-lg" />
                )}

                {selected.description && (
                  <p className="text-sm text-foreground whitespace-pre-wrap">{selected.description}</p>
                )}

                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  {selected.location && <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{selected.location}</span>}
                  {selected.item_date && <span className="flex items-center gap-1"><CalendarIcon className="h-4 w-4" />{selected.item_date}</span>}
                </div>

                <div className="flex items-center justify-between gap-3 p-3 bg-accent/40 rounded-lg">
                  <button
                    onClick={() => navigate(`/user/${selected.user_id}`)}
                    className="flex items-center gap-2 hover:opacity-80"
                  >
                    <Avatar className="h-9 w-9">
                      {selected.author?.avatar_url && <AvatarImage src={selected.author.avatar_url} />}
                      <AvatarFallback>{selected.author?.full_name?.[0] || "?"}</AvatarFallback>
                    </Avatar>
                    <div className="text-left">
                      <p className="text-sm font-medium">{selected.author?.full_name || "Unknown"}</p>
                      <p className="text-xs text-muted-foreground">
                        Posted {formatDistanceToNow(new Date(selected.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </button>

                  {user?.id !== selected.user_id ? (
                    <Button size="sm" onClick={() => startDM(selected.user_id)} className="gradient-primary gap-1">
                      <MessageSquare className="h-4 w-4" /> Message
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => toggleStatus(selected)} className="gap-1">
                        <CheckCircle2 className="h-4 w-4" />
                        {selected.status === "open" ? "Mark Resolved" : "Reopen"}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => deleteItem(selected)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  )}
                </div>

                {/* Comments */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold">Comments ({comments.length})</h4>
                  {comments.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No comments yet. Be the first!</p>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {comments.map((c) => (
                        <div key={c.id} className="flex gap-2 group">
                          <Avatar className="h-7 w-7 shrink-0">
                            {c.author?.avatar_url && <AvatarImage src={c.author.avatar_url} />}
                            <AvatarFallback className="text-xs">{c.author?.full_name?.[0] || "?"}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 bg-accent/30 rounded-lg px-3 py-2">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-xs font-medium">{c.author?.full_name || "Unknown"}</p>
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] text-muted-foreground">
                                  {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                                </span>
                                {user?.id === c.author_id && (
                                  <button
                                    onClick={() => deleteComment(c.id)}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    <Trash2 className="h-3 w-3 text-destructive" />
                                  </button>
                                )}
                              </div>
                            </div>
                            <p className="text-sm mt-0.5 whitespace-pre-wrap">{c.content}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {user && (
                    <div className="flex gap-2">
                      <Input
                        placeholder="Add a comment..."
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); addComment(); } }}
                        maxLength={300}
                      />
                      <Button size="icon" onClick={addComment} disabled={!commentText.trim()} className="gradient-primary shrink-0">
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default LostFoundPage;
