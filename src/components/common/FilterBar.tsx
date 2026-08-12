"use client";

import { cn } from "@/lib/utils";

export function FilterBar({
  options,
  value,
  onChange,
  className,
  variant = "tabs",
}: {
  options: readonly string[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
  variant?: "tabs" | "pills";
}) {
  return (
    <div
      className={cn(
        "no-scrollbar -mx-5 flex gap-1 overflow-x-auto px-5 lg:mx-0 lg:px-0",
        variant === "tabs" && "border-b border-border",
        className,
      )}
      role="tablist"
    >
      {options.map((option) => {
        const active = option === value;
        return (
          <button
            key={option}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option)}
            className={cn(
              "meta shrink-0 whitespace-nowrap px-3 py-2.5 transition-colors",
              variant === "tabs"
                ? active
                  ? "-mb-px border-b-2 border-primary text-primary"
                  : "-mb-px border-b-2 border-transparent text-muted-foreground hover:text-foreground"
                : active
                  ? "rounded-sm bg-navy text-navy-foreground"
                  : "rounded-sm bg-surface text-muted-foreground hover:text-foreground",
            )}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}
