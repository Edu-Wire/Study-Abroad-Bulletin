import React from "react";
import * as Flags from "country-flag-icons/react/3x2";
import { getCountryCode, getCanonicalCountryName } from "@/lib/countries";
import { cn } from "@/lib/utils";

interface CountryFlagProps {
  country?: string;
  code?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  showTitle?: boolean;
}

const sizeClasses = {
  xs: "w-3.5 h-[9.33px]", // ~14px
  sm: "w-4.5 h-[12px]",  // ~18px
  md: "w-6 h-[16px]",    // ~24px
  lg: "w-8 h-[21.33px]", // ~32px
  xl: "w-11 h-[29.33px]",// ~44px
};

export function CountryFlag({
  country,
  code,
  size = "sm",
  className,
  showTitle = true,
}: CountryFlagProps) {
  const resolvedCode = (code ? code.toUpperCase() : getCountryCode(country)) || undefined;

  if (!resolvedCode) return null;

  const FlagComponent = (Flags as Record<string, React.ComponentType<{ className?: string; title?: string }>>)[resolvedCode];

  if (!FlagComponent) return null;

  const titleText = country ? getCanonicalCountryName(country) : resolvedCode;

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center overflow-hidden border border-black/10 shadow-[0_0_1px_rgba(0,0,0,0.12)] align-middle rounded-[1px]",
        sizeClasses[size],
        className,
      )}
      aria-label={titleText}
    >
      <FlagComponent
        className="h-full w-full object-cover"
        title={showTitle ? titleText : undefined}
      />
    </span>
  );
}
