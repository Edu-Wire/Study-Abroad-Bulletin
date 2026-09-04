"use client";

/**
 * Shared presentation for the ingestion Admin screens.
 *
 * Six screens show the same handful of things — a routing lane, a processing
 * status, a relevance score, a "this is not live data" banner. They live here so
 * a status colour means the same thing on every screen; an editor learning that
 * amber is REVIEW on one page and something else on the next is worse than no
 * colour at all.
 */

import type { ReactNode } from "react";
import { AlertTriangle, Info, X } from "lucide-react";

import type {
  CandidateStatus,
  ProcessingStatus,
  SourceRunStatus,
} from "@/lib/ingestion-admin";

// ============================================================
// Banners
// ============================================================

/**
 * Shown when the API could not be reached. Deliberately loud: every number on
 * the screen behind it is either empty or catalog-only.
 */
export function OriginNotice({ notice }: { notice?: string | null }) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-200/80 bg-amber-50 px-4 py-2.5 text-xs text-amber-900">
      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
      <span className="font-semibold">Live data unavailable.</span>
      <span>{notice ?? "The ingestion API did not answer."}</span>
    </div>
  );
}

export function NoticeBar({
  notice,
  tone = "info",
  onDismiss,
}: {
  notice: string;
  tone?: "info" | "error" | "success";
  onDismiss: () => void;
}) {
  const styles = {
    info: "border-blue-200/80 bg-blue-50 text-[#1769E0]",
    success: "border-emerald-200/80 bg-emerald-50 text-emerald-800",
    error: "border-rose-200/80 bg-rose-50 text-rose-800",
  }[tone];

  return (
    <div
      role="status"
      className={`flex items-start justify-between gap-3 rounded-lg border px-4 py-2.5 text-xs font-medium ${styles}`}
    >
      <span className="flex items-start gap-2">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>{notice}</span>
      </span>
      <button
        onClick={onDismiss}
        aria-label="Dismiss"
        className="shrink-0 rounded p-0.5 hover:bg-black/5 cursor-pointer"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ============================================================
// Badges
// ============================================================

function badge(className: string, label: ReactNode, title?: string) {
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border px-2 py-0.5 text-[11px] font-semibold ${className}`}
    >
      {label}
    </span>
  );
}

/**
 * The internal 10.3 lane rather than the coarser stored decision: HOLD and
 * CRITICAL_DRAFT_ALERT are meaningfully different from IGNORE and AUTO_DRAFT to
 * the person triaging the queue.
 */
const LANE_STYLES: Record<string, { style: string; label: string; title: string }> = {
  CRITICAL_DRAFT_ALERT: {
    style: "border-rose-500/25 bg-rose-500/10 text-rose-700",
    label: "Critical draft",
    title: "Relevance ≥ 90 and confidence ≥ 90: drafted and flagged for immediate attention",
  },
  AUTO_DRAFT: {
    style: "border-emerald-500/25 bg-emerald-500/10 text-emerald-700",
    label: "Create draft",
    title: "Cleared the auto-draft thresholds; a human still publishes",
  },
  CREATE_DRAFT: {
    style: "border-emerald-500/25 bg-emerald-500/10 text-emerald-700",
    label: "Create draft",
    title: "Routed to the draft lane",
  },
  REVIEW: {
    style: "border-amber-500/25 bg-amber-500/10 text-amber-700",
    label: "Review",
    title: "Relevant, but an editor decides",
  },
  HOLD: {
    style: "border-slate-300 bg-slate-100 text-slate-600",
    label: "Hold",
    title: "Low-priority filter only; no candidate created",
  },
  IGNORE: {
    style: "border-slate-300 bg-slate-100 text-slate-500",
    label: "Ignore",
    title: "Below the relevance floor; evidence retained, no candidate",
  },
  PUBLISH: {
    style: "border-rose-500/25 bg-rose-500/10 text-rose-700",
    label: "Publish",
    title: "Phase 1 never produces this lane",
  },
};

export function RouteBadge({ lane }: { lane: string }) {
  const meta = LANE_STYLES[lane];
  if (!meta) return badge("border-slate-200 bg-slate-50 text-slate-500", lane || "—");
  return badge(meta.style, meta.label, meta.title);
}

const PROCESSING_STYLES: Record<ProcessingStatus, string> = {
  DISCOVERED: "border-slate-200 bg-slate-50 text-slate-600",
  DETAIL_PENDING: "border-slate-200 bg-slate-50 text-slate-600",
  ENRICHED: "border-sky-200 bg-sky-50 text-sky-700",
  NORMALIZED: "border-sky-200 bg-sky-50 text-sky-700",
  VERSIONED: "border-violet-200 bg-violet-50 text-violet-700",
  SCORED: "border-violet-200 bg-violet-50 text-violet-700",
  CLASSIFIED: "border-blue-200 bg-blue-50 text-[#1769E0]",
  ROUTED: "border-blue-200 bg-blue-50 text-[#1769E0]",
  IMPORTED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  PUBLISHED: "border-emerald-300 bg-emerald-100 text-emerald-800",
};

export function ProcessingBadge({ status }: { status: ProcessingStatus }) {
  return badge(
    PROCESSING_STYLES[status] ?? "border-slate-200 bg-slate-50 text-slate-500",
    status.replace(/_/g, " ").toLowerCase()
  );
}

const CANDIDATE_STYLES: Record<CandidateStatus, string> = {
  PENDING: "border-amber-500/25 bg-amber-500/10 text-amber-700",
  APPROVED: "border-emerald-500/25 bg-emerald-500/10 text-emerald-700",
  REJECTED: "border-rose-500/25 bg-rose-500/10 text-rose-700",
  AUTO_DRAFTED: "border-blue-500/25 bg-blue-500/10 text-[#1769E0]",
  DRAFT_CREATED: "border-emerald-500/25 bg-emerald-500/10 text-emerald-700",
  IGNORED: "border-slate-300 bg-slate-100 text-slate-500",
};

export function CandidateBadge({ status }: { status: CandidateStatus }) {
  return badge(
    CANDIDATE_STYLES[status] ?? "border-slate-200 bg-slate-50 text-slate-500",
    status.replace(/_/g, " ").toLowerCase()
  );
}

const RUN_STYLES: Record<SourceRunStatus, string> = {
  RUNNING: "border-blue-500/25 bg-blue-500/10 text-[#1769E0]",
  SUCCESS: "border-emerald-500/25 bg-emerald-500/10 text-emerald-700",
  FAILED: "border-rose-500/25 bg-rose-500/10 text-rose-700",
  PARTIAL: "border-amber-500/25 bg-amber-500/10 text-amber-700",
};

export function RunBadge({ status }: { status: SourceRunStatus }) {
  return badge(RUN_STYLES[status] ?? "border-slate-200 bg-slate-50 text-slate-500", status.toLowerCase());
}

export function HealthBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    HEALTHY: "border-emerald-500/25 bg-emerald-500/10 text-emerald-700",
    DEGRADED: "border-amber-500/25 bg-amber-500/10 text-amber-700",
    STALE: "border-slate-300 bg-slate-100 text-slate-600",
    BROKEN: "border-rose-500/25 bg-rose-500/10 text-rose-700",
    RATE_LIMITED: "border-orange-500/25 bg-orange-500/10 text-orange-700",
  };
  return badge(
    styles[status] ?? "border-slate-200 bg-slate-50 text-slate-500",
    status.replace(/_/g, " ").toLowerCase()
  );
}

export function CategoryBadge({
  category,
  reason,
}: {
  category: string | null | undefined;
  reason?: string | null;
}) {
  if (!category) {
    // Not an error state: "no automatic category" is a decision the mapping
    // made on purpose, and the reason is worth reading before overriding it.
    return badge(
      "border-slate-300 bg-slate-50 text-slate-500",
      "editor selects",
      reason ?? "No automatic CMS category; an editor chooses one"
    );
  }
  return badge("border-slate-200 bg-white text-slate-700", category.toLowerCase(), reason ?? undefined);
}

// ============================================================
// Scores
// ============================================================

/** A single 0-100 relevance axis. Colour tracks the 10.3 thresholds. */
export function ScoreBar({
  label,
  value,
  emphasis = false,
}: {
  label: string;
  value: number | undefined;
  emphasis?: boolean;
}) {
  const score = typeof value === "number" && Number.isFinite(value) ? Math.round(value) : null;
  const tone =
    score === null
      ? "bg-slate-200"
      : score >= 75
        ? "bg-emerald-500"
        : score >= 55
          ? "bg-amber-500"
          : score >= 30
            ? "bg-slate-400"
            : "bg-slate-300";

  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-2">
        <span
          className={`text-[11px] ${emphasis ? "font-bold text-slate-900" : "font-medium text-slate-500"}`}
        >
          {label}
        </span>
        <span className="font-mono text-[11px] tabular-nums text-slate-600">
          {score === null ? "—" : `${score}/100`}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${score ?? 0}%` }} />
      </div>
    </div>
  );
}

// ============================================================
// Layout
// ============================================================

export function Panel({
  title,
  action,
  children,
  className = "",
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.02)] ${className}`}
    >
      <header className="flex items-center justify-between gap-3 border-b border-slate-200/80 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[#1769E0]" />
          <h2 className="text-xs font-bold tracking-tight text-slate-900 sm:text-sm">{title}</h2>
        </div>
        {action}
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}

/** Label/value row for the operations screens. Monospaced values on request. */
export function Field({
  label,
  value,
  mono = false,
  title,
}: {
  label: string;
  value: ReactNode;
  mono?: boolean;
  title?: string;
}) {
  return (
    <div className="min-w-0 space-y-0.5" title={title}>
      <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</dt>
      <dd
        className={`truncate text-xs text-slate-800 ${mono ? "font-mono text-[11px]" : "font-medium"}`}
      >
        {value ?? "—"}
      </dd>
    </div>
  );
}

export function ActionButton({
  label,
  icon: Icon,
  onClick,
  busy = false,
  disabled = false,
  tone = "default",
  title,
}: {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  busy?: boolean;
  disabled?: boolean;
  tone?: "default" | "primary" | "danger";
  title?: string;
}) {
  const styles = {
    default: "border-slate-200 bg-white text-slate-700 hover:border-[#1769E0] hover:text-[#1769E0]",
    primary: "border-[#1769E0] bg-[#1769E0] text-white hover:bg-[#1357bd]",
    danger: "border-slate-200 bg-white text-slate-600 hover:border-rose-400 hover:text-rose-600",
  }[tone];

  return (
    <button
      onClick={onClick}
      disabled={busy || disabled}
      title={title}
      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${styles}`}
    >
      {Icon && <Icon className={`h-3.5 w-3.5 ${busy ? "animate-spin" : ""}`} />}
      {busy ? "Working…" : label}
    </button>
  );
}
