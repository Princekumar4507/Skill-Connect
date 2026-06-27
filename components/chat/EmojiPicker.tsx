import { useEffect, useRef } from "react";

interface EmojiPickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (emoji: string) => void;
}

const EMOJIS = [
  "😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😍",
  "😘", "😎", "🥳", "🤩", "😇", "🤗", "🤔", "😴", "😭", "😡",
  "👍", "👎", "👏", "🙌", "🙏", "💪", "🔥", "❤️", "💯", "✅",
];

const EmojiPicker = ({ open, onClose, onSelect }: EmojiPickerProps) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={ref}
      className="absolute bottom-14 right-0 z-50 w-72 rounded-xl border bg-popover p-3 shadow-xl"
      onMouseDown={(e) => e.preventDefault()}
    >
      <div className="grid grid-cols-10 gap-1">
        {EMOJIS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => onSelect(emoji)}
            className="h-7 w-7 rounded-md text-base hover:bg-secondary transition-colors"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
};

export default EmojiPicker;
