"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

export function SearchBar({
  placeholder = "Search universities, scholarships, news…",
  value,
  onChange,
  onSubmit,
  className,
  size = "md",
  autoFocus,
}: {
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  onSubmit?: (value: string) => void;
  className?: string;
  size?: "sm" | "md" | "lg";
  autoFocus?: boolean;
}) {
  const router = useRouter();
  const [internalQuery, setInternalQuery] = useState(value || "");

  const query = value !== undefined ? value : internalQuery;

  const handleChange = (val: string) => {
    if (value === undefined) setInternalQuery(val);
    onChange?.(val);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (onSubmit) {
      onSubmit(q);
    } else if (q) {
      router.push(`/search?q=${encodeURIComponent(q)}`);
    }
  };

  const handleClear = () => {
    handleChange("");
  };

  const heights = { sm: "h-9", md: "h-11", lg: "h-12" } as const;

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        "flex items-center gap-2 rounded-md border border-border bg-background px-3 transition-colors focus-within:border-primary",
        heights[size],
        className,
      )}
    >
      <button type="submit" aria-label="Submit search" className="text-muted-foreground hover:text-primary transition-colors shrink-0">
        <Search className="size-4" />
      </button>
      <input
        type="search"
        value={query}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        autoFocus={autoFocus}
        className="w-full min-w-0 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
      />
      {query && (
        <button
          type="button"
          onClick={handleClear}
          aria-label="Clear search"
          className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
        >
          <X className="size-4" />
        </button>
      )}
    </form>
  );
}
