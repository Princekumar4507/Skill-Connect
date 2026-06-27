import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Share2, Copy, MessageCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface SharePopoverProps {
  postId: string;
  postTitle: string;
}

const SharePopover = ({ postId, postTitle }: SharePopoverProps) => {
  const url = `${window.location.origin}/post/${postId}`;

  const copyLink = () => {
    navigator.clipboard.writeText(url);
    toast({ title: "Link copied!" });
  };

  const shareWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(`${postTitle} — ${url}`)}`, "_blank");
  };

  const shareTwitter = () => {
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(postTitle)}&url=${encodeURIComponent(url)}`, "_blank");
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors">
          <Share2 className="h-4 w-4" /> Share
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-2" align="start">
        <button onClick={copyLink} className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded-md hover:bg-secondary transition-colors text-foreground">
          <Copy className="h-4 w-4" /> Copy Link
        </button>
        <button onClick={shareWhatsApp} className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded-md hover:bg-secondary transition-colors text-foreground">
          <MessageCircle className="h-4 w-4" /> WhatsApp
        </button>
        <button onClick={shareTwitter} className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded-md hover:bg-secondary transition-colors text-foreground">
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
          Twitter / X
        </button>
      </PopoverContent>
    </Popover>
  );
};

export default SharePopover;
