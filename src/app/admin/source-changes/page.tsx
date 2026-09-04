"use client";

/**
 * Source Changes - versioned diffs from watched rule pages (Blueprint 11.2).
 *
 * A watched page that edits its eligibility, fees or effective dates without a
 * press release shows up here as a diff, not a silent rewrite of a published
 * article — editors decide whether it needs a new candidate.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { History, ArrowRight, ExternalLink } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminEmptyState } from "@/components/admin/AdminTable";
import { getCatalogSources } from "@/lib/content-sources";
import { getSourceChanges, type SourceChangeSummary } from "@/lib/source-changes";
import type { DataOrigin } from "@/lib/ingestion-api";

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminSourceChangesPage() {
  const watchedSources = getCatalogSources().filter((source) => source.transport === "WATCH");

  const [changes, setChanges] = useState<SourceChangeSummary[]>([]);
  const [origin, setOrigin] = useState<DataOrigin>("FALLBACK");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getSourceChanges({ limit: 50 })
      .then((result) => {
        if (cancelled) return;
        setChanges(result.data);
        setOrigin(result.origin);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Source Changes"
        description="Versioned diffs from watched rule pages - visa fees, eligibility, work rights and effective dates that change without a press release."
        count={changes.length}
        countLabel="material changes"
      />

      {origin === "FALLBACK" && !loading && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-200/80 bg-amber-50 px-4 py-2.5 text-xs text-amber-900">
          <span className="rounded bg-amber-200/70 px-1.5 py-0.5 font-bold uppercase tracking-wider text-[10px]">
            No live data
          </span>
          <span>Change events are unavailable until the ingestion API is running.</span>
        </div>
      )}

      {changes.length === 0 ? (
        <div className="rounded-xl border border-slate-200/80 bg-white">
          <AdminEmptyState
            title={loading ? "Loading changes..." : "No change events yet"}
            description={
              loading
                ? "Fetching watched-page diffs."
                : `${watchedSources.length} rule-page watches are configured across Canada, the UK, Australia, the United States, Germany, New Zealand and Ireland. Diffs appear here once the ingestion worker snapshots a change.`
            }
            icon={History}
            action={
              !loading && (
                <Link
                  href="/admin/sources"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1769E0] hover:underline"
                >
                  Review configured sources
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              )
            }
          />
        </div>
      ) : (
        <div className="space-y-3">
          {changes.map((change) => (
            <div
              key={change.id}
              className="bg-white border border-slate-200/80 rounded-xl p-4 flex items-start justify-between gap-3"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <span>{change.sourceItem.contentSource.name}</span>
                  <span>·</span>
                  <span>{formatDateTime(change.detectedAt)}</span>
                </div>
                <p className="text-sm font-semibold text-slate-900 mt-1 truncate">
                  {change.sourceItem.title}
                </p>
                <div className="mt-1.5 flex items-center gap-2 text-[11px]">
                  <span
                    className={`px-1.5 py-0.5 rounded font-semibold ${
                      change.isMaterial
                        ? "bg-amber-50 text-amber-700 border border-amber-200"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {change.isMaterial ? "Material change" : "Minor change"}
                  </span>
                  <span className="text-emerald-600">+{change.addedTokens}</span>
                  <span className="text-rose-600">-{change.removedTokens}</span>
                  <span className="text-slate-400">
                    v{change.priorVersion.versionNumber} → v{change.nextVersion.versionNumber}
                  </span>
                </div>
                {change.changeSummary && (
                  <p className="mt-1.5 text-xs text-slate-500">{change.changeSummary}</p>
                )}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Link
                  href={`/admin/source-items/${change.sourceItem.id}`}
                  className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border border-slate-200 text-slate-600 hover:text-[#1769E0] hover:border-[#1769E0] transition-colors"
                >
                  Review
                </Link>
                <a
                  href={change.sourceItem.canonicalUrl}
                  target="_blank"
                  rel="noreferrer"
                  title="View source"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-[#1769E0] hover:bg-blue-50 transition-colors"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
