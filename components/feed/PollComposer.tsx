import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";

interface PollComposerProps {
  options: string[];
  onChange: (options: string[]) => void;
}

const PollComposer = ({ options, onChange }: PollComposerProps) => {
  const updateOption = (index: number, value: string) => {
    const updated = [...options];
    updated[index] = value;
    onChange(updated);
  };

  const addOption = () => {
    if (options.length < 4) onChange([...options, ""]);
  };

  const removeOption = (index: number) => {
    if (options.length > 2) onChange(options.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2 p-3 bg-secondary/30 rounded-lg border">
      <p className="text-xs font-medium text-muted-foreground">Poll Options</p>
      {options.map((opt, i) => (
        <div key={i} className="flex gap-2">
          <Input
            placeholder={`Option ${i + 1}`}
            value={opt}
            onChange={(e) => updateOption(i, e.target.value)}
            className="flex-1 bg-background border text-sm h-9"
          />
          {options.length > 2 && (
            <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => removeOption(i)}>
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      ))}
      {options.length < 4 && (
        <Button variant="outline" size="sm" onClick={addOption} className="w-full text-xs">
          <Plus className="h-3.5 w-3.5 mr-1" /> Add Option
        </Button>
      )}
    </div>
  );
};

export default PollComposer;
