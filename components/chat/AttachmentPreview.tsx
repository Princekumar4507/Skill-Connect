import * as React from "react";
import { X, FileText, Film } from "lucide-react";

interface AttachmentPreviewProps {
  file: File;
  previewUrl: string | null;
  onRemove: () => void;
}

const AttachmentPreview = React.forwardRef<HTMLDivElement, AttachmentPreviewProps>(
  ({ file, previewUrl, onRemove }, ref) => {
    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");

    return (
      <div ref={ref} className="p-3 border-t bg-secondary/30">
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            {isImage && previewUrl ? (
              <img src={previewUrl} alt="Preview" className="h-16 w-16 rounded-lg object-cover border" />
            ) : isVideo ? (
              <div className="h-16 w-16 rounded-lg bg-muted flex items-center justify-center border">
                <Film className="h-6 w-6 text-muted-foreground" />
              </div>
            ) : (
              <div className="h-16 w-16 rounded-lg bg-muted flex items-center justify-center border">
                <FileText className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
            <button
              type="button"
              onClick={onRemove}
              className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full h-5 w-5 flex items-center justify-center"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
            <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
          </div>
        </div>
      </div>
    );
  },
);

AttachmentPreview.displayName = "AttachmentPreview";

export default AttachmentPreview;
