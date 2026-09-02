"use client";

/**
 * Source Changes - placeholder for the change-watch review queue (Blueprint 11.2).
 *
 * The nav entry ships with the sources dashboard, so this route exists to avoid
 * a dead link. Rule-page diffs land here once the change-watch adapters and the
 * version store are live; a published article is never silently rewritten from
 * one, it raises an editorial update alert.
 */

import Link from "next/link";
import { History, ArrowRight } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { getCatalogSources } from "@/lib/content-sources";

export default function AdminSourceChangesPage() {
  const watchedSources = getCatalogSources().filter(
    (source) => source.transport === "WATCH"
  );

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Source Changes"
        description="Versioned diffs from watched rule pages - visa fees, eligibility, work rights and effective dates that change without a press release."
        count={watchedSources.length}
        countLabel="watched sources"
      />

      <div className="rounded-xl border border-slate-200/80 bg-white p-8 text-center">
        <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-blue-50">
          <History className="h-5 w-5 text-[#1769E0]" />
        </div>
        <h2 className="text-sm font-bold text-slate-900">No change events yet</h2>
        <p className="mx-auto mt-1.5 max-w-md text-xs leading-relaxed text-slate-500">
          {watchedSources.length} rule-page watches are configured across Canada, the UK,
          Australia, the United States, Germany, New Zealand and Ireland. Diffs appear here
          once the ingestion worker begins snapshotting them.
        </p>
        <Link
          href="/admin/sources"
          className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-[#1769E0] hover:underline"
        >
          Review configured sources
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
