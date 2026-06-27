import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FileText, Download, X, ZoomIn, ZoomOut, DownloadCloud, Check, CheckCheck } from "lucide-react";
import { format } from "date-fns";

interface MessageBubbleProps {
  content: string;
  senderId: string;
  createdAt: string;
  attachmentUrl?: string | null;
  attachmentType?: string | null;
  attachmentName?: string | null;
  isMine: boolean;
  participantName: string;
  participantAvatar?: string | null;
  readAt?: string | null;
  recipientOnline?: boolean;
  isPending?: boolean;
}

const MessageBubble = ({
  content,
  createdAt,
  attachmentUrl,
  attachmentType,
  attachmentName,
  isMine,
  participantName,
  participantAvatar,
  readAt,
  recipientOnline,
  isPending,
}: MessageBubbleProps) => {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const initials = participantName.split(" ").map((n) => n[0]).join("").slice(0, 2);

  const renderAttachment = () => {
    if (!attachmentUrl) return null;

    if (attachmentType?.startsWith("image/")) {
      return (
        <img
          src={attachmentUrl}
          alt={attachmentName || "Image"}
          className="rounded-lg max-w-full max-h-60 object-cover cursor-pointer mb-1 hover:opacity-90 transition-opacity"
          onClick={() => { setLightboxOpen(true); setZoom(1); }}
        />
      );
    }

    if (attachmentType?.startsWith("video/")) {
      return (
        <video
          src={attachmentUrl}
          controls
          className="rounded-lg max-w-full max-h-60 mb-1"
        />
      );
    }

    return (
      <a
        href={attachmentUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`flex items-center gap-2 p-2 rounded-lg border mb-1 ${
          isMine ? "border-primary-foreground/20 hover:bg-primary-foreground/10" : "border-border hover:bg-secondary"
        } transition-colors`}
      >
        <FileText className="h-5 w-5 shrink-0" />
        <span className="text-sm truncate flex-1">{attachmentName || "File"}</span>
        <Download className="h-4 w-4 shrink-0" />
      </a>
    );
  };

  const renderReadReceipt = () => {
    if (!isMine) return null;

    // Pending (still uploading/sending) → single gray check
    if (isPending) {
      return <Check className="h-3.5 w-3.5 text-primary-foreground/50" />;
    }

    // Read → double green check
    if (readAt) {
      return <CheckCheck className="h-3.5 w-3.5 text-emerald-400" />;
    }

    // Delivered (recipient online) → double gray check
    if (recipientOnline) {
      return <CheckCheck className="h-3.5 w-3.5 text-primary-foreground/70" />;
    }

    // Sent (recipient offline) → single gray check
    return <Check className="h-3.5 w-3.5 text-primary-foreground/50" />;
  };

  return (
    <>
      <div className={`flex ${isMine ? "justify-end" : "justify-start"} gap-2`}>
        {!isMine && (
          <Avatar className="h-8 w-8 mt-1 shrink-0">
            {participantAvatar && <AvatarImage src={participantAvatar} alt={participantName} />}
            <AvatarFallback className="bg-muted text-muted-foreground text-xs">
              {initials}
            </AvatarFallback>
          </Avatar>
        )}
        <div
          className={`max-w-[70%] rounded-2xl px-4 py-3 ${
            isMine
              ? "gradient-primary text-primary-foreground"
              : "bg-secondary text-foreground"
          }`}
        >
          {renderAttachment()}
          {content && <p className="text-sm leading-relaxed">{content}</p>}
          <div className={`flex items-center gap-1 mt-1.5 justify-end ${isMine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
            <p className="text-[10px]">
              {format(new Date(createdAt), "h:mm a")}
            </p>
            {renderReadReceipt()}
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {lightboxOpen && attachmentUrl && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center"
          onClick={() => setLightboxOpen(false)}
        >
          <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 z-10">
            <p className="text-white/70 text-sm truncate max-w-[60%]">{attachmentName || "Image"}</p>
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => { e.stopPropagation(); setZoom((z) => Math.max(0.5, z - 0.25)); }}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                <ZoomOut className="h-5 w-5" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setZoom((z) => Math.min(3, z + 0.25)); }}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                <ZoomIn className="h-5 w-5" />
              </button>
              <a
                href={attachmentUrl}
                download={attachmentName || "image"}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                <DownloadCloud className="h-5 w-5" />
              </a>
              <button
                onClick={() => setLightboxOpen(false)}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <img
            src={attachmentUrl}
            alt={attachmentName || "Image"}
            className="max-w-[90vw] max-h-[85vh] object-contain transition-transform duration-200"
            style={{ transform: `scale(${zoom})` }}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
};

export default MessageBubble;
