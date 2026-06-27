import { useState, useEffect } from "react";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, ShoppingBag, Tag, MessageSquare, Trash2, IndianRupee } from "lucide-react";
import { useNavigate } from "react-router-dom";

const categories = ["Books", "Electronics", "Gadgets", "Course Materials", "Stationery", "Other"];
const conditions = ["New", "Like New", "Good", "Fair", "Poor"];

interface Listing {
  id: string;
  seller_id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  condition: string;
  image_url: string | null;
  status: string;
  created_at: string;
  seller?: { full_name: string; avatar_url: string | null; college: string | null };
}

const MarketplacePage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("All");
  const [dialogOpen, setDialogOpen] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("Books");
  const [condition, setCondition] = useState("Good");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [creating, setCreating] = useState(false);

  const fetchListings = async () => {
    const { data } = await supabase
      .from("marketplace_listings")
      .select("*")
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (data?.length) {
      const sellerIds = [...new Set(data.map((l: any) => l.seller_id))];
      const { data: sellers } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url, college")
        .in("user_id", sellerIds);

      const sellerMap: Record<string, any> = {};
      (sellers || []).forEach((s) => { sellerMap[s.user_id] = s; });

      setListings(data.map((l: any) => ({ ...l, seller: sellerMap[l.seller_id] })));
    } else {
      setListings([]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchListings(); }, []);

  const handleCreate = async () => {
    if (!user || !title.trim() || !price) return;
    setCreating(true);

    let imageUrl: string | null = null;
    if (imageFile) {
      const ext = imageFile.name.split(".").pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("marketplace-images").upload(path, imageFile);
      if (!uploadError) {
        const { data: urlData } = supabase.storage.from("marketplace-images").getPublicUrl(path);
        imageUrl = urlData.publicUrl;
      }
    }

    const { error } = await supabase.from("marketplace_listings").insert({
      seller_id: user.id,
      title: title.trim(),
      description: description.trim(),
      price: parseFloat(price),
      category,
      condition,
      image_url: imageUrl,
    });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Listing created!" });
      setTitle(""); setDescription(""); setPrice(""); setCategory("Books"); setCondition("Good"); setImageFile(null);
      setDialogOpen(false);
      fetchListings();
    }
    setCreating(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("marketplace_listings").delete().eq("id", id);
    setListings((prev) => prev.filter((l) => l.id !== id));
    toast({ title: "Listing deleted" });
  };

  const handleContact = async (sellerId: string) => {
    if (!user) return;
    // Check if conversation exists
    const { data: myConvos } = await supabase
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", user.id);

    if (myConvos?.length) {
      const convoIds = myConvos.map((c) => c.conversation_id);
      const { data: shared } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", sellerId)
        .in("conversation_id", convoIds);

      if (shared?.length) {
        navigate("/messages");
        return;
      }
    }

    // Create new conversation
    const { data: convo } = await supabase.from("conversations").insert({}).select().single();
    if (convo) {
      await supabase.from("conversation_participants").insert([
        { conversation_id: convo.id, user_id: user.id },
        { conversation_id: convo.id, user_id: sellerId },
      ]);
      navigate("/messages");
    }
  };

  const filtered = listings.filter((l) => {
    const matchSearch = l.title.toLowerCase().includes(search.toLowerCase()) || l.description.toLowerCase().includes(search.toLowerCase());
    const matchCategory = filterCategory === "All" || l.category === filterCategory;
    return matchSearch && matchCategory;
  });

  return (
    <Layout>
      <div className="container py-6 max-w-6xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <ShoppingBag className="h-6 w-6 text-primary" />
              Campus Marketplace
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Buy, sell & exchange with fellow students</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-primary gap-2"><Plus className="h-4 w-4" /> Post Listing</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>Create New Listing</DialogTitle></DialogHeader>
              <div className="space-y-4 mt-2">
                <div>
                  <Label>Title</Label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Data Structures textbook" />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe your item..." rows={3} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Price (₹)</Label>
                    <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0" min="0" />
                  </div>
                  <div>
                    <Label>Category</Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Condition</Label>
                  <Select value={condition} onValueChange={setCondition}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{conditions.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Photo</Label>
                  <Input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
                </div>
                <Button onClick={handleCreate} disabled={creating || !title.trim() || !price} className="w-full gradient-primary">
                  {creating ? "Posting..." : "Post Listing"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search listings..." className="pl-10" />
          </div>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Categories</SelectItem>
              {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Listings grid */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <ShoppingBag className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">No listings found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((listing) => (
              <Card key={listing.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                {listing.image_url && (
                  <div className="aspect-video bg-muted overflow-hidden">
                    <img src={listing.image_url} alt={listing.title} className="w-full h-full object-cover" />
                  </div>
                )}
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-semibold text-foreground line-clamp-1">{listing.title}</h3>
                    <span className="flex items-center gap-0.5 text-lg font-bold text-primary shrink-0">
                      <IndianRupee className="h-4 w-4" />{listing.price}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{listing.description}</p>
                  <div className="flex gap-2 mb-3">
                    <Badge variant="secondary" className="text-xs">
                      <Tag className="h-3 w-3 mr-1" />{listing.category}
                    </Badge>
                    <Badge variant="outline" className="text-xs">{listing.condition}</Badge>
                  </div>

                  {/* Seller info */}
                  <div className="flex items-center justify-between pt-3 border-t">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        {listing.seller?.avatar_url && <AvatarImage src={listing.seller.avatar_url} />}
                        <AvatarFallback className="text-[10px]">
                          {listing.seller?.full_name?.charAt(0) || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs text-muted-foreground">{listing.seller?.full_name || "Unknown"}</span>
                    </div>
                    {user?.id === listing.seller_id ? (
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(listing.id)} className="text-destructive h-8">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" onClick={() => handleContact(listing.seller_id)} className="h-8 gap-1">
                        <MessageSquare className="h-3.5 w-3.5" /> Contact
                      </Button>
                    )}
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

export default MarketplacePage;
