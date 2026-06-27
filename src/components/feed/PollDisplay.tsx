import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { CheckCircle2 } from "lucide-react";

interface PollOption {
  id: string;
  option_text: string;
  vote_count: number;
}

interface PollDisplayProps {
  postId: string;
}

const PollDisplay = ({ postId }: PollDisplayProps) => {
  const { user } = useAuth();
  const [options, setOptions] = useState<PollOption[]>([]);
  const [userVoteOptionId, setUserVoteOptionId] = useState<string | null>(null);
  const [pollId, setPollId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPoll = async () => {
      const { data: poll } = await supabase
        .from("polls")
        .select("id")
        .eq("post_id", postId)
        .maybeSingle();

      if (!poll) { setLoading(false); return; }
      setPollId(poll.id);

      const [{ data: opts }, { data: votes }] = await Promise.all([
        supabase.from("poll_options").select("*").eq("poll_id", poll.id).order("created_at"),
        user ? supabase.from("poll_votes").select("poll_option_id").eq("user_id", user.id) : { data: [] },
      ]);

      setOptions(opts || []);
      const userVote = (votes || []).find((v: any) =>
        (opts || []).some((o: any) => o.id === v.poll_option_id)
      );
      if (userVote) setUserVoteOptionId(userVote.poll_option_id);
      setLoading(false);
    };
    fetchPoll();
  }, [postId, user]);

  const vote = async (optionId: string) => {
    if (!user || !pollId || userVoteOptionId) return;

    // Optimistic update
    setUserVoteOptionId(optionId);
    setOptions((prev) =>
      prev.map((o) => o.id === optionId ? { ...o, vote_count: o.vote_count + 1 } : o)
    );

    await supabase.from("poll_votes").insert({ poll_option_id: optionId, user_id: user.id });
    await supabase.from("poll_options").update({ vote_count: options.find(o => o.id === optionId)!.vote_count + 1 }).eq("id", optionId);
  };

  if (loading || !pollId) return null;

  const totalVotes = options.reduce((a, b) => a + b.vote_count, 0);
  const hasVoted = !!userVoteOptionId;

  return (
    <div className="space-y-2 my-3">
      {options.map((opt) => {
        const pct = totalVotes > 0 ? Math.round((opt.vote_count / totalVotes) * 100) : 0;
        const isSelected = opt.id === userVoteOptionId;

        return (
          <button
            key={opt.id}
            onClick={() => vote(opt.id)}
            disabled={hasVoted}
            className={`w-full relative rounded-lg border px-4 py-2.5 text-left text-sm transition-colors overflow-hidden ${
              isSelected
                ? "border-primary bg-primary/5"
                : hasVoted
                ? "border-border"
                : "border-border hover:border-primary/50 cursor-pointer"
            }`}
          >
            {hasVoted && (
              <div
                className="absolute inset-0 bg-primary/10 transition-all"
                style={{ width: `${pct}%` }}
              />
            )}
            <div className="relative flex items-center justify-between">
              <span className="flex items-center gap-2">
                {isSelected && <CheckCircle2 className="h-4 w-4 text-primary" />}
                {opt.option_text}
              </span>
              {hasVoted && (
                <span className="text-xs font-medium text-muted-foreground">{pct}%</span>
              )}
            </div>
          </button>
        );
      })}
      {totalVotes > 0 && (
        <p className="text-xs text-muted-foreground text-right">{totalVotes} vote{totalVotes !== 1 ? "s" : ""}</p>
      )}
    </div>
  );
};

export default PollDisplay;
