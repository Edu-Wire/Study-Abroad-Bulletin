"use client";

import { useState } from "react";
import { Bookmark } from "lucide-react";
import { cn } from "@/lib/utils";

export function BookmarkButton({
  label = "Save",
  className,
}: {
  label?: string;
  className?: string;
}) {
  const [saved, setSaved] = useState(false);
  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={saved ? "Saved" : label}
      onClick={() => setSaved((s) => !s)}
      className={cn(
        "grid size-8 shrink-0 place-items-center rounded-sm border border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary",
        saved && "border-primary bg-primary-soft text-primary",
        className,
      )}
    >
      <Bookmark
        className={cn("size-4 transition-transform", saved && "scale-110 fill-current")}
        aria-hidden
      />
    </button>
  );
}
