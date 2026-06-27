import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  mentionedUsers: { user_id: string; full_name: string }[];
  onMentionsChange: (users: { user_id: string; full_name: string }[]) => void;
}

interface SuggestionProfile {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  college: string | null;
}

const MentionInput = ({ value, onChange, placeholder, rows = 3, mentionedUsers, onMentionsChange }: MentionInputProps) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestionProfile[]>([]);
  const [mentionQuery, setMentionQuery] = useState("");
  const [cursorPos, setCursorPos] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mentionQuery || mentionQuery.length < 1) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url, college")
        .ilike("full_name", `%${mentionQuery}%`)
        .limit(5);
      setSuggestions(data || []);
    }, 300);
    return () => clearTimeout(timer);
  }, [mentionQuery]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const pos = e.target.selectionStart || 0;
    setCursorPos(pos);
    onChange(newValue);

    // Check for @ mention
    const textBeforeCursor = newValue.slice(0, pos);
    const atMatch = textBeforeCursor.match(/@(\w*)$/);
    if (atMatch) {
      setMentionQuery(atMatch[1]);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
      setMentionQuery("");
    }
  };

  const selectUser = (user: SuggestionProfile) => {
    const textBeforeCursor = value.slice(0, cursorPos);
    const atIndex = textBeforeCursor.lastIndexOf("@");
    const before = value.slice(0, atIndex);
    const after = value.slice(cursorPos);
    const newValue = `${before}@${user.full_name} ${after}`;
    onChange(newValue);
    setShowSuggestions(false);
    setMentionQuery("");

    if (!mentionedUsers.some((m) => m.user_id === user.user_id)) {
      onMentionsChange([...mentionedUsers, { user_id: user.user_id, full_name: user.full_name }]);
    }

    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const getInitials = (name: string) => name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        rows={rows}
        className="w-full bg-secondary/50 rounded-md px-3 py-2 text-sm outline-none placeholder:text-muted-foreground resize-none"
      />

      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute left-0 right-0 z-50 mt-1 rounded-lg border bg-popover shadow-lg max-h-48 overflow-y-auto"
        >
          {suggestions.map((s) => (
            <button
              key={s.user_id}
              onClick={() => selectUser(s)}
              className="flex items-center gap-2 w-full px-3 py-2 hover:bg-secondary transition-colors text-left"
            >
              <Avatar className="h-7 w-7">
                {s.avatar_url && <AvatarImage src={s.avatar_url} className="object-cover" />}
                <AvatarFallback className="text-xs bg-muted">{getInitials(s.full_name)}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium text-foreground">{s.full_name}</p>
                {s.college && <p className="text-xs text-muted-foreground">{s.college}</p>}
              </div>
            </button>
          ))}
        </div>
      )}

      {mentionedUsers.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1">
          {mentionedUsers.map((m) => (
            <span key={m.user_id} className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
              @{m.full_name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default MentionInput;
