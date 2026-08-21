"use client";

import React from "react";

export type StatusType =
  | "PUBLISHED"
  | "DRAFT"
  | "PENDING_REVIEW"
  | "ARCHIVED"
  | "REJECTED"
  | "ACTIVE"
  | "INVITED"
  | "SUSPENDED"
  | "URGENT"
  | "STANDARD"
  | "RSS"
  | "EDITORIAL"
  | "OPEN"
  | "CLOSING_SOON"
  | "FULLY_FUNDED"
  | "PARTIAL"
  | "AVAILABLE"
  | "NONE"
  | string;

interface StatusBadgeProps {
  status: StatusType;
  label?: string;
  size?: "sm" | "md";
  showDot?: boolean;
  className?: string;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; bg: string; text: string; border: string; dot: string }
> = {
  // Editorial / Article Statuses
  PUBLISHED: {
    label: "Published",
    bg: "bg-emerald-500/10",
    text: "text-emerald-700",
    border: "border-emerald-500/20",
    dot: "bg-emerald-500",
  },
  DRAFT: {
    label: "Draft",
    bg: "bg-amber-500/10",
    text: "text-amber-700",
    border: "border-amber-500/20",
    dot: "bg-amber-500",
  },
  PENDING_REVIEW: {
    label: "Pending Review",
    bg: "bg-indigo-500/10",
    text: "text-indigo-700",
    border: "border-indigo-500/20",
    dot: "bg-indigo-500",
  },
  ARCHIVED: {
    label: "Archived",
    bg: "bg-slate-500/10",
    text: "text-slate-600",
    border: "border-slate-500/20",
    dot: "bg-slate-400",
  },
  REJECTED: {
    label: "Rejected",
    bg: "bg-rose-500/10",
    text: "text-rose-700",
    border: "border-rose-500/20",
    dot: "bg-rose-500",
  },

  // User / Member Statuses
  ACTIVE: {
    label: "Active",
    bg: "bg-emerald-500/10",
    text: "text-emerald-700",
    border: "border-emerald-500/20",
    dot: "bg-emerald-500",
  },
  INVITED: {
    label: "Invited",
    bg: "bg-amber-500/10",
    text: "text-amber-700",
    border: "border-amber-500/20",
    dot: "bg-amber-500",
  },
  SUSPENDED: {
    label: "Suspended",
    bg: "bg-rose-500/10",
    text: "text-rose-700",
    border: "border-rose-500/20",
    dot: "bg-rose-500",
  },

  // Visa & Alert Statuses
  URGENT: {
    label: "Urgent Policy",
    bg: "bg-rose-500/10",
    text: "text-rose-700",
    border: "border-rose-500/20",
    dot: "bg-rose-500",
  },
  STANDARD: {
    label: "Standard Notice",
    bg: "bg-slate-500/10",
    text: "text-slate-700",
    border: "border-slate-500/20",
    dot: "bg-slate-400",
  },

  // Source Type Badges
  RSS: {
    label: "RSS Import",
    bg: "bg-sky-500/10",
    text: "text-sky-700",
    border: "border-sky-500/20",
    dot: "bg-sky-500",
  },
  EDITORIAL: {
    label: "Editorial",
    bg: "bg-emerald-500/10",
    text: "text-emerald-700",
    border: "border-emerald-500/20",
    dot: "bg-emerald-500",
  },

  // Deadline & Scholarship Statuses
  OPEN: {
    label: "Open",
    bg: "bg-emerald-500/10",
    text: "text-emerald-700",
    border: "border-emerald-500/20",
    dot: "bg-emerald-500",
  },
  CLOSING_SOON: {
    label: "Closing Soon",
    bg: "bg-rose-500/10",
    text: "text-rose-700",
    border: "border-rose-500/20",
    dot: "bg-rose-500",
  },
  FULLY_FUNDED: {
    label: "Fully Funded",
    bg: "bg-emerald-500/10",
    text: "text-emerald-700",
    border: "border-emerald-500/20",
    dot: "bg-emerald-500",
  },
  PARTIAL: {
    label: "Partial Funding",
    bg: "bg-blue-500/10",
    text: "text-blue-700",
    border: "border-blue-500/20",
    dot: "bg-blue-500",
  },
  AVAILABLE: {
    label: "Available",
    bg: "bg-emerald-500/10",
    text: "text-emerald-700",
    border: "border-emerald-500/20",
    dot: "bg-emerald-500",
  },
  NONE: {
    label: "None",
    bg: "bg-slate-100",
    text: "text-slate-600",
    border: "border-slate-200",
    dot: "bg-slate-400",
  },
};

export function StatusBadge({
  status,
  label,
  size = "sm",
  showDot = true,
  className = "",
}: StatusBadgeProps) {
  const normalizedKey = (status || "").toUpperCase().replace(/\s+/g, "_");
  const config = STATUS_CONFIG[normalizedKey] || {
    label: label || status,
    bg: "bg-slate-100",
    text: "text-slate-700",
    border: "border-slate-200",
    dot: "bg-slate-400",
  };

  const displayText = label || config.label || status;

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border transition-colors ${
        config.bg
      } ${config.text} ${config.border} ${
        size === "sm"
          ? "px-2.5 py-0.5 text-[11px] leading-tight"
          : "px-3 py-1 text-xs leading-normal"
      } ${className}`}
    >
      {showDot && (
        <span
          className={`h-1.5 w-1.5 rounded-full shrink-0 ${config.dot}`}
          aria-hidden="true"
        />
      )}
      <span className="truncate">{displayText}</span>
    </span>
  );
}
