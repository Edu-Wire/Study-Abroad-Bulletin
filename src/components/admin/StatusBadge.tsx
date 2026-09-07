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
    bg: "bg-[#DCFCE7]",
    text: "text-[#166534]",
    border: "border-[#BBF7D0]",
    dot: "bg-[#16A34A]",
  },
  DRAFT: {
    label: "Draft",
    bg: "bg-[#FEF3C7]",
    text: "text-[#92400E]",
    border: "border-[#FDE68A]",
    dot: "bg-[#D97706]",
  },
  PENDING_REVIEW: {
    label: "Pending Review",
    bg: "bg-[#E0E7FF]",
    text: "text-[#3730A3]",
    border: "border-[#C7D2FE]",
    dot: "bg-[#6366F1]",
  },
  ARCHIVED: {
    label: "Archived",
    bg: "bg-[#E2E8F0]",
    text: "text-[#334155]",
    border: "border-[#CBD5E1]",
    dot: "bg-[#64748B]",
  },
  REJECTED: {
    label: "Rejected",
    bg: "bg-[#FFE4E6]",
    text: "text-[#9F1239]",
    border: "border-[#FECDD3]",
    dot: "bg-[#F43F5E]",
  },

  // User / Member Statuses
  ACTIVE: {
    label: "Active",
    bg: "bg-[#DCFCE7]",
    text: "text-[#166534]",
    border: "border-[#BBF7D0]",
    dot: "bg-[#16A34A]",
  },
  INVITED: {
    label: "Invited",
    bg: "bg-[#FEF3C7]",
    text: "text-[#92400E]",
    border: "border-[#FDE68A]",
    dot: "bg-[#D97706]",
  },
  SUSPENDED: {
    label: "Suspended",
    bg: "bg-[#FFE4E6]",
    text: "text-[#9F1239]",
    border: "border-[#FECDD3]",
    dot: "bg-[#F43F5E]",
  },

  // Visa & Alert Statuses
  URGENT: {
    label: "Urgent Policy",
    bg: "bg-[#FFE4E6]",
    text: "text-[#9F1239]",
    border: "border-[#FECDD3]",
    dot: "bg-[#F43F5E]",
  },
  STANDARD: {
    label: "Standard Notice",
    bg: "bg-[#E2E8F0]",
    text: "text-[#334155]",
    border: "border-[#CBD5E1]",
    dot: "bg-[#64748B]",
  },

  // Source Type Badges
  RSS: {
    label: "RSS Import",
    bg: "bg-[#D0E2FF]",
    text: "text-[#1B3256]",
    border: "border-[#B2D2FE]",
    dot: "bg-[#1D68E2]",
  },
  EDITORIAL: {
    label: "Editorial",
    bg: "bg-[#D1F2E0]",
    text: "text-[#0D5432]",
    border: "border-[#A8E6C3]",
    dot: "bg-[#10B981]",
  },

  // Deadline & Scholarship Statuses
  OPEN: {
    label: "Open",
    bg: "bg-[#DCFCE7]",
    text: "text-[#166534]",
    border: "border-[#BBF7D0]",
    dot: "bg-[#16A34A]",
  },
  CLOSING_SOON: {
    label: "Closing Soon",
    bg: "bg-[#FFE4E6]",
    text: "text-[#9F1239]",
    border: "border-[#FECDD3]",
    dot: "bg-[#F43F5E]",
  },
  FULLY_FUNDED: {
    label: "Fully Funded",
    bg: "bg-[#DCFCE7]",
    text: "text-[#166534]",
    border: "border-[#BBF7D0]",
    dot: "bg-[#16A34A]",
  },
  PARTIAL: {
    label: "Partial Funding",
    bg: "bg-[#D0E2FF]",
    text: "text-[#1B3256]",
    border: "border-[#B2D2FE]",
    dot: "bg-[#1D68E2]",
  },
  AVAILABLE: {
    label: "Available",
    bg: "bg-[#DCFCE7]",
    text: "text-[#166534]",
    border: "border-[#BBF7D0]",
    dot: "bg-[#16A34A]",
  },
  NONE: {
    label: "None",
    bg: "bg-[#E2E8F0]",
    text: "text-[#475569]",
    border: "border-[#CBD5E1]",
    dot: "bg-[#64748B]",
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
    bg: "bg-[#E2E8F0]",
    text: "text-[#334155]",
    border: "border-[#CBD5E1]",
    dot: "bg-[#64748B]",
  };

  const displayText = label || config.label || status;

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-semibold rounded-md border transition-colors shadow-2xs ${
        config.bg
      } ${config.text} ${config.border} ${
        size === "sm"
          ? "px-2 py-0.5 text-[11px] leading-tight"
          : "px-2.5 py-1 text-xs leading-normal"
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
