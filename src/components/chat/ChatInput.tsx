import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, Paperclip, Smile, Image, Film, FileText, Loader2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import EmojiPicker from "./EmojiPicker";
import AttachmentPreview from "./AttachmentPreview";

interface ChatInputProps {
  onSend: (message: string, file?: File) => Promise<boolean>;
  onTypingChange?: (typing: boolean) => void;
  disabled?: boolean;
}

const ChatInput = ({ onSend, onTypingChange, disabled }: ChatInputProps) => {
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [sending, setSending] = useState(false);
  const [attachOpen, setAttachOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const stopTypingTimeoutRef = useRef<number | null>(null);

  const handleFileSelect = (accept: string) => {
    if (fileInputRef.current) {
      fileInputRef.current.accept = accept;
      fileInputRef.current.click();
    }
    setAttachOpen(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    if (selected.size > 10 * 1024 * 1024) {
      alert("File size must be under 10MB");
      return;
    }
    setFile(selected);
    if (selected.type.startsWith("image/")) {
      setFilePreview(URL.createObjectURL(selected));
    } else {
      setFilePreview(null);
    }
    e.target.value = "";
  };

  const removeFile = () => {
    if (filePreview) URL.revokeObjectURL(filePreview);
    setFile(null);
    setFilePreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!text.trim() && !file) || sending) return;
    setSending(true);
    onTypingChange?.(false);
    if (stopTypingTimeoutRef.current) {
      window.clearTimeout(stopTypingTimeoutRef.current);
      stopTypingTimeoutRef.current = null;
    }
    try {
      const success = await onSend(text.trim(), file || undefined);
      if (success) {
        setText("");
        removeFile();
      }
    } finally {
      setSending(false);
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    const next = text + emoji;
    setText(next);
    onTypingChange?.(next.trim().length > 0);
    setShowEmoji(false);
  };

  const handleTextChange = (value: string) => {
    setText(value);

    const isTyping = value.trim().length > 0;
    onTypingChange?.(isTyping);

    if (stopTypingTimeoutRef.current) {
      window.clearTimeout(stopTypingTimeoutRef.current);
    }

    if (isTyping) {
      stopTypingTimeoutRef.current = window.setTimeout(() => {
        onTypingChange?.(false);
      }, 1200);
    }
  };

  useEffect(() => {
    return () => {
      if (stopTypingTimeoutRef.current) {
        window.clearTimeout(stopTypingTimeoutRef.current);
      }
      onTypingChange?.(false);
    };
  }, [onTypingChange]);

  const attachOptions = [
    { icon: Image, label: "Photo", accept: "image/*" },
    { icon: Film, label: "Video", accept: "video/*" },
    { icon: FileText, label: "Document", accept: ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip" },
  ];

  return (
    <div className="safe-area-bottom">
      {file && (
        <AttachmentPreview file={file} previewUrl={filePreview} onRemove={removeFile} />
      )}
      <div className="p-4 border-t">
        <form onSubmit={handleSubmit} className="flex items-center gap-3 min-w-0">
          <Popover open={attachOpen} onOpenChange={setAttachOpen}>
            <PopoverTrigger asChild>
              <button type="button" className="text-muted-foreground hover:text-foreground transition-colors shrink-0">
                <Paperclip className="h-5 w-5" />
              </button>
            </PopoverTrigger>
            <PopoverContent side="top" align="start" className="w-44 p-1">
              {attachOptions.map((opt) => (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => handleFileSelect(opt.accept)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-foreground hover:bg-secondary rounded-md transition-colors"
                >
                  <opt.icon className="h-4 w-4 text-muted-foreground" />
                  {opt.label}
                </button>
              ))}
            </PopoverContent>
          </Popover>

          <div className="flex-1 relative">
            <Input
              placeholder="Type a message..."
              value={text}
              onChange={(e) => handleTextChange(e.target.value)}
              className="pr-10 bg-secondary/50 border-0"
              disabled={disabled || sending}
            />
            <button
              type="button"
              onClick={() => setShowEmoji(!showEmoji)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <Smile className="h-5 w-5" />
            </button>
            <EmojiPicker open={showEmoji} onClose={() => setShowEmoji(false)} onSelect={handleEmojiSelect} />
          </div>

          <Button
            type="submit"
            size="icon"
            className="gradient-primary shrink-0 rounded-full h-10 w-10"
            disabled={(!text.trim() && !file) || sending}
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
      </div>

      <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />
    </div>
  );
};

export default ChatInput;
