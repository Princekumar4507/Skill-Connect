import { useState, useRef } from "react";
import Layout from "@/components/Layout";
import TabBar from "@/components/TabBar";
import { Calendar, Clock, MapPin, Users, ExternalLink, ThumbsUp, Plus, Loader2, Trash2, ImagePlus, Search } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";

const typeColors: Record<string, string> = {
  Hackathon: "bg-primary text-primary-foreground",
  Workshop: "bg-accent text-accent-foreground",
  Networking: "bg-primary text-primary-foreground",
  Seminar: "bg-accent text-accent-foreground",
  Other: "bg-muted text-muted-foreground",
};

const typeOptions = ["Hackathon", "Workshop", "Networking", "Seminar", "Webinar", "Conference", "Meetup", "Bootcamp", "Competition", "Cultural", "Sports", "Other"];
const tabs = ["Upcoming", "My Events", "Hackathons", "Workshops", "Conferences", "Meetups", "Webinars", "Bootcamps"];

const EventsPage = () => {
  const [tab, setTab] = useState("Upcoming");
  const [searchQuery, setSearchQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", type: "Hackathon", date: "", time: "", location: "", host: "" });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch events with registration count
  const { data: events = [], isLoading } = useQuery({
    queryKey: ["events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*, event_registrations(user_id)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data.map((e: any) => ({
        ...e,
        attendees: e.event_registrations?.length || 0,
        registeredUserIds: e.event_registrations?.map((r: any) => r.user_id) || [],
      }));
    },
  });

  // Create event
  const createMutation = useMutation({
    mutationFn: async () => {
      let imageUrl: string | null = null;

      // Upload image if selected
      if (imageFile) {
        const fileExt = imageFile.name.split(".").pop();
        const filePath = `${user!.id}/${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from("event-images")
          .upload(filePath, imageFile);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage
          .from("event-images")
          .getPublicUrl(filePath);
        imageUrl = urlData.publicUrl;
      }

      const { error } = await supabase.from("events").insert({
        title: form.title.trim(),
        description: form.description.trim(),
        type: form.type,
        date: form.date,
        time: form.time,
        location: form.location.trim(),
        host: form.host.trim(),
        image_url: imageUrl,
        creator_id: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      setCreateOpen(false);
      setForm({ title: "", description: "", type: "Hackathon", date: "", time: "", location: "", host: "" });
      setImageFile(null);
      setImagePreview(null);
      toast({ title: "Event created!" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // Register for event
  const registerMutation = useMutation({
    mutationFn: async (eventId: string) => {
      const { error } = await supabase.from("event_registrations").insert({
        event_id: eventId,
        user_id: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      toast({ title: "Registered!" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // Unregister
  const unregisterMutation = useMutation({
    mutationFn: async (eventId: string) => {
      const { error } = await supabase
        .from("event_registrations")
        .delete()
        .eq("event_id", eventId)
        .eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      toast({ title: "Unregistered" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // Delete event
  const deleteMutation = useMutation({
    mutationFn: async (eventId: string) => {
      const { error } = await supabase.from("events").delete().eq("id", eventId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      toast({ title: "Event deleted" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const isRegistered = (e: any) => e.registeredUserIds?.includes(user?.id);
  const isCreator = (e: any) => e.creator_id === user?.id;

  const tabFiltered =
    tab === "Upcoming"
      ? events
      : tab === "My Events"
      ? events.filter((e: any) => isRegistered(e) || isCreator(e))
      : tab === "Hackathons"
      ? events.filter((e: any) => e.type === "Hackathon")
      : tab === "Workshops"
      ? events.filter((e: any) => e.type === "Workshop")
      : tab === "Conferences"
      ? events.filter((e: any) => e.type === "Conference")
      : tab === "Meetups"
      ? events.filter((e: any) => e.type === "Meetup")
      : tab === "Webinars"
      ? events.filter((e: any) => e.type === "Webinar")
      : tab === "Bootcamps"
      ? events.filter((e: any) => e.type === "Bootcamp")
      : events;

  const filtered = searchQuery.trim()
    ? tabFiltered.filter((e: any) => {
        const q = searchQuery.toLowerCase();
        return (
          e.title?.toLowerCase().includes(q) ||
          e.description?.toLowerCase().includes(q) ||
          e.host?.toLowerCase().includes(q) ||
          e.location?.toLowerCase().includes(q)
        );
      })
    : tabFiltered;

  return (
    <Layout>
      <div className="container py-8">
        <TabBar tabs={tabs} active={tab} onChange={setTab} />

        {/* Search Bar */}
        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search events by title, description, host..."
            className="pl-9"
          />
        </div>

        {/* Create Event Button */}
        <div className="mt-6 mb-4">
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-primary text-primary-foreground gap-2">
                <Plus className="h-4 w-4" /> Create New Event
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90dvh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create an Event</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div>
                  <label className="text-sm font-medium text-foreground">Title</label>
                  <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Climate Tech Hackathon" />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Description</label>
                  <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What is this event about?" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-foreground">Type</label>
                    <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {typeOptions.map((t) => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground">Host</label>
                    <Input value={form.host} onChange={(e) => setForm({ ...form, host: e.target.value })} placeholder="e.g. MIT AI Club" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-foreground">Date</label>
                    <Input value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} placeholder="e.g. May 15-17, 2025" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground">Time</label>
                    <Input value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} placeholder="e.g. 9:00 AM - 5:00 PM" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Location</label>
                  <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="e.g. Virtual Event or Campus Hall" />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Cover Image</label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setImageFile(file);
                        setImagePreview(URL.createObjectURL(file));
                      }
                    }}
                  />
                  {imagePreview ? (
                    <div className="relative mt-1 rounded-lg overflow-hidden border">
                      <img src={imagePreview} alt="Preview" className="w-full h-32 object-cover" />
                      <button
                        type="button"
                        className="absolute top-2 right-2 bg-background/80 rounded-full p-1 text-destructive hover:bg-background"
                        onClick={() => { setImageFile(null); setImagePreview(null); }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="mt-1 w-full h-24 border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <ImagePlus className="h-6 w-6" />
                      <span className="text-xs">Click to upload</span>
                    </button>
                  )}
                </div>
                <Button
                  className="w-full"
                  disabled={!form.title.trim() || !form.date.trim() || createMutation.isPending}
                  onClick={() => createMutation.mutate()}
                >
                  {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Event"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            {tab === "My Events" ? "You haven't registered for any events yet." : "No events found."}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((e: any) => {
              const registered = isRegistered(e);
              const creator = isCreator(e);
              return (
                <div key={e.id} className="bg-card rounded-xl border overflow-hidden flex flex-col">
                  <div className="h-40 bg-muted relative">
                    {e.image_url && (
                      <img src={e.image_url} alt={e.title} className="w-full h-full object-cover" />
                    )}
                    <span className={`absolute top-3 right-3 text-xs px-3 py-1 rounded-full font-medium ${typeColors[e.type] || typeColors.Other}`}>
                      {e.type}
                    </span>
                  </div>
                  <div className="p-5 flex flex-col flex-1">
                    <h3 className="font-bold text-foreground">{e.title}</h3>
                    {e.host && <p className="text-sm text-muted-foreground">{e.host}</p>}
                    {creator && <p className="text-xs text-primary font-medium mt-1">✨ You created this</p>}
                    <div className="mt-3 space-y-1.5 text-sm text-muted-foreground">
                      <p className="flex items-center gap-2"><Calendar className="h-3.5 w-3.5" /> {e.date}</p>
                      {e.time && <p className="flex items-center gap-2"><Clock className="h-3.5 w-3.5" /> {e.time}</p>}
                      {e.location && <p className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5" /> {e.location}</p>}
                    </div>
                    {e.description && (
                      <p className="text-sm text-muted-foreground mt-3 line-clamp-2">{e.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
                      <Users className="h-3 w-3" /> {e.attendees} student{e.attendees !== 1 ? "s" : ""} attending
                    </p>

                    {registered && (
                      <p className="flex items-center gap-2 text-primary text-sm mt-2">
                        <ThumbsUp className="h-3.5 w-3.5" /> You're registered!
                      </p>
                    )}

                    <div className="flex gap-2 mt-4 mt-auto pt-2">
                      {registered ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={(ev) => { ev.stopPropagation(); unregisterMutation.mutate(e.id); }}
                          disabled={unregisterMutation.isPending}
                        >
                          Unregister
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          className="gradient-primary text-primary-foreground ml-auto"
                          onClick={(ev) => { ev.stopPropagation(); registerMutation.mutate(e.id); }}
                          disabled={registerMutation.isPending}
                        >
                          Register
                        </Button>
                      )}
                      {creator && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:text-destructive ml-auto"
                          onClick={(ev) => { ev.stopPropagation(); deleteMutation.mutate(e.id); }}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default EventsPage;
