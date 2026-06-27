import { useState, useRef, useEffect } from "react";
import { SmilePlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

const REACTIONS = [
  { type: "like", emoji: "👍" },
  { type: "love", emoji: "❤️" },
  { type: "laugh", emoji: "😂" },
  { type: "fire", emoji: "🔥" },
  { type: "celebrate", emoji: "🎉" },
];

interface ReactionPickerProps {
  postId: string;
  reactions: Record<string, number>;
  userReactions: string[];
  onToggle: (type: string) => void;
}

interface ReactionUser {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  reaction_type: string;
}

const ReactionPicker = ({ postId, reactions, userReactions, onToggle }: ReactionPickerProps) => {
  const [open, setOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogReactionType, setDialogReactionType] = useState<string | null>(null);
  const [reactionUsers, setReactionUsers] = useState<ReactionUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const totalReactions = Object.values(reactions).reduce((a, b) => a + b, 0);
  const hasUserReacted = userReactions.length > 0;

  const fetchReactionUsers = async (type: string | null) => {
    setLoadingUsers(true);
    let query = supabase
      .from("post_reactions")
      .select("user_id, reaction_type")
      .eq("post_id", postId);

    if (type) {
      query = query.eq("reaction_type", type);
    }

    const { data } = await query;
    if (!data) { setLoadingUsers(false); return; }

    const userIds = [...new Set(data.map((r) => r.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name, avatar_url")
      .in("user_id", userIds);

    const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);
    const users: ReactionUser[] = data.map((r) => ({
      user_id: r.user_id,
      reaction_type: r.reaction_type,
      full_name: profileMap.get(r.user_id)?.full_name || "Unknown",
      avatar_url: profileMap.get(r.user_id)?.avatar_url || null,
    }));
    setReactionUsers(users);
    setLoadingUsers(false);
  };

  const handleBadgeClick = (type: string) => {
    setDialogReactionType(type);
    setDialogOpen(true);
    fetchReactionUsers(type);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 text-sm transition-colors ${
          hasUserReacted ? "text-primary" : "text-muted-foreground hover:text-primary"
        }`}
      >
        {hasUserReacted ? (
          <span className="text-base leading-none">
            {REACTIONS.find((r) => r.type === userReactions[0])?.emoji || "👍"}
          </span>
        ) : (
          <SmilePlus className="h-4 w-4" />
        )}
        {totalReactions > 0 && <span>{totalReactions}</span>}
      </button>

      {open && (
        <div className="absolute bottom-8 left-0 z-50 flex gap-1 rounded-full border bg-popover px-2 py-1.5 shadow-lg">
          {REACTIONS.map((r) => (
            <button
              key={r.type}
              onClick={() => { onToggle(r.type); setOpen(false); }}
              className={`h-8 w-8 rounded-full text-lg hover:bg-secondary transition-colors flex items-center justify-center ${
                userReactions.includes(r.type) ? "bg-primary/20 ring-1 ring-primary" : ""
              }`}
              title={r.type}
            >
              {r.emoji}
            </button>
          ))}
        </div>
      )}

      {/* Show grouped reactions below */}
      {totalReactions > 0 && (
        <div className="flex gap-1 mt-1">
          {REACTIONS.filter((r) => reactions[r.type] > 0).map((r) => (
            <span
              key={r.type}
              className={`text-xs px-1.5 py-0.5 rounded-full border flex items-center gap-0.5 cursor-pointer transition-colors ${
                userReactions.includes(r.type) ? "bg-primary/10 border-primary/30 text-primary" : "text-muted-foreground"
              }`}
              onClick={() => handleBadgeClick(r.type)}
            >
              {r.emoji} {reactions[r.type]}
            </span>
          ))}
        </div>
      )}

      {/* Dialog showing who reacted */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {dialogReactionType && (
                <span className="text-xl">
                  {REACTIONS.find((r) => r.type === dialogReactionType)?.emoji}
                </span>
              )}
              Reactions
            </DialogTitle>
          </DialogHeader>

          {/* Reaction type filter tabs */}
          <div className="flex gap-1 flex-wrap">
            {REACTIONS.filter((r) => reactions[r.type] > 0).map((r) => (
              <button
                key={r.type}
                onClick={() => { setDialogReactionType(r.type); fetchReactionUsers(r.type); }}
                className={`text-sm px-2.5 py-1 rounded-full border transition-colors ${
                  dialogReactionType === r.type
                    ? "bg-primary/10 border-primary/30 text-primary"
                    : "text-muted-foreground hover:bg-secondary"
                }`}
              >
                {r.emoji} {reactions[r.type]}
              </button>
            ))}
          </div>

          <ScrollArea className="max-h-64">
            {loadingUsers ? (
              <p className="text-sm text-muted-foreground text-center py-4">Loading...</p>
            ) : reactionUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No reactions</p>
            ) : (
              <div className="space-y-2">
                {reactionUsers.map((u) => (
                  <div key={`${u.user_id}-${u.reaction_type}`} className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/50 transition-colors">
                    <Avatar className="h-8 w-8">
                      {u.avatar_url && <AvatarImage src={u.avatar_url} />}
                      <AvatarFallback className="text-xs bg-muted text-muted-foreground">
                        {u.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium text-foreground flex-1">{u.full_name}</span>
                    <span className="text-base">
                      {REACTIONS.find((r) => r.type === u.reaction_type)?.emoji}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ReactionPicker;
