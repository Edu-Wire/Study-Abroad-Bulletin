"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ExternalLink,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Loader2,
  FileText,
  History,
  Sparkles,
} from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminEmptyState } from "@/components/admin/AdminTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import {
  getSourceItemDetail,
  reclassifySourceItem,
  createDraftFromSourceItem,
  ignoreSourceItem,
  ROUTING_LABELS,
  type SourceItemDetail,
} from "@/lib/source-items";
import type { DataOrigin } from "@/lib/ingestion-api";

function formatDateTime(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function SourceItemDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [item, setItem] = useState<SourceItemDetail | null>(null);
  const [origin, setOrigin] = useState<DataOrigin>("FALLBACK");
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = () => {
    getSourceItemDetail(id)
      .then((result) => {
        setItem(result.data);
        setOrigin(result.origin);
        if (!result.data) setNotice(result.notice ?? "This item is not available.");
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const runAction = async (action: () => Promise<{ accepted: boolean; notice: string }>) => {
    setBusy(true);
    const result = await action();
    setNotice(result.notice);
    setBusy(false);
    if (result.accepted) load();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <AdminPageHeader
          title="Loading..."
          description="Fetching source item detail."
          backHref="/admin/source-items"
          backLabel="Back to Source Items"
        />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="space-y-6">
        <AdminPageHeader
          title="Source item"
          description="This item could not be loaded."
          backHref="/admin/source-items"
          backLabel="Back to Source Items"
        />
        <div className="bg-white border border-slate-200/80 rounded-xl">
          <AdminEmptyState
            title="Not available"
            description={notice ?? "The ingestion API is not reachable, or this item does not exist."}
            icon={FileText}
          />
        </div>
      </div>
    );
  }

  const latestVersion = item.versions[0];
  const candidate = item.candidate;
  const canDraft =
    candidate && candidate.status !== "DRAFT_CREATED" && candidate.status !== "IGNORED";

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={item.title}
        description={`${item.contentSource.name} (${item.contentSource.sourceType}) · discovered ${formatDateTime(item.discoveredAt)}`}
        backHref="/admin/source-items"
        backLabel="Back to Source Items"
      >
        <a
          href={item.canonicalUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 h-9 px-3.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-200 rounded-lg transition-colors"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          View Full Source
        </a>
      </AdminPageHeader>

      {origin === "FALLBACK" && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-200/80 bg-amber-50 px-4 py-2.5 text-xs text-amber-900">
          <span className="rounded bg-amber-200/70 px-1.5 py-0.5 font-bold uppercase tracking-wider text-[10px]">
            No live data
          </span>
          <span>The ingestion API is not reachable — this page is showing stale or no data.</span>
        </div>
      )}

      {notice && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-blue-200/80 bg-blue-50 px-4 py-2.5 text-xs font-medium text-[#1769E0]">
          <span>{notice}</span>
          <button onClick={() => setNotice(null)} className="text-[11px] font-semibold uppercase tracking-wider hover:underline">
            Dismiss
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={item.processingStatus} showDot={false} />
        {item.externalId && (
          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-500 text-[11px] font-mono">
            {item.externalId}
          </span>
        )}
        {item.nativeTopics.map((topic) => (
          <span key={topic} className="px-2 py-0.5 rounded bg-blue-50 text-[#1769E0] text-[11px] font-medium">
            {topic}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-4">
          <section className="bg-white border border-slate-200/80 rounded-xl p-4">
            <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              <FileText className="h-3.5 w-3.5" />
              Full Source Content {latestVersion && `· v${latestVersion.versionNumber}`}
            </h2>
            {latestVersion ? (
              <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap max-h-96 overflow-y-auto">
                {latestVersion.cleanText || "No extracted text for this version."}
              </div>
            ) : (
              <p className="text-xs text-slate-500">No document version captured yet.</p>
            )}
          </section>

          {item.versions.length > 0 && (
            <section className="bg-white border border-slate-200/80 rounded-xl p-4">
              <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                <History className="h-3.5 w-3.5" />
                Version History ({item.versions.length})
              </h2>
              <div className="space-y-2.5">
                {item.versions.map((version) => (
                  <div key={version.id} className="flex items-start gap-3 pb-2.5 border-b border-slate-100 last:border-0 last:pb-0">
                    <span className="mt-0.5 h-5 w-5 shrink-0 rounded-full bg-slate-100 text-slate-500 text-[10px] font-bold flex items-center justify-center">
                      {version.versionNumber}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold text-slate-900">
                        {formatDateTime(version.capturedAt)}
                        {version.httpStatus && (
                          <span className="ml-2 text-slate-400 font-normal">HTTP {version.httpStatus}</span>
                        )}
                      </div>
                      {version.diffsFromPrior.map((diff) => (
                        <div key={diff.id} className="mt-1 flex items-center gap-2 text-[11px]">
                          <span
                            className={`px-1.5 py-0.5 rounded font-semibold ${
                              diff.isMaterial
                                ? "bg-amber-50 text-amber-700 border border-amber-200"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {diff.isMaterial ? "Material change" : "Minor change"}
                          </span>
                          <span className="text-emerald-600">+{diff.addedTokens}</span>
                          <span className="text-rose-600">-{diff.removedTokens}</span>
                          {diff.changeSummary && (
                            <span className="text-slate-500 truncate">{diff.changeSummary}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Side column */}
        <div className="space-y-4">
          {item.assessments.length > 0 && (
            <section className="bg-white border border-slate-200/80 rounded-xl p-4">
              <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                <Sparkles className="h-3.5 w-3.5" />
                AI Assessment
              </h2>
              {item.assessments.map((a) => (
                <div key={a.id} className="space-y-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{Math.round(a.relevanceScore * 100)}%</span>
                    <span className="text-slate-400">relevance</span>
                    <span className="text-slate-300">·</span>
                    <span className="font-bold text-slate-900">{Math.round(a.confidenceScore * 100)}%</span>
                    <span className="text-slate-400">confidence</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded-md bg-blue-50 text-[#1769E0] text-[11px] font-semibold border border-blue-200/80">
                      {ROUTING_LABELS[a.routingDecision] ?? a.routingDecision}
                    </span>
                    {a.urgency && (
                      <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 text-[11px] font-semibold border border-rose-200/80">
                        {a.urgency}
                      </span>
                    )}
                  </div>
                  <p className="text-slate-500">
                    {a.internalCategory}
                    {a.suggestedCategory ? ` → ${a.suggestedCategory}` : ""}
                  </p>
                  {a.suggestedSummary && <p className="text-slate-600 leading-relaxed">{a.suggestedSummary}</p>}
                  {a.keyTakeaways.length > 0 && (
                    <ul className="list-disc list-inside text-slate-500 space-y-0.5">
                      {a.keyTakeaways.map((t, i) => (
                        <li key={i}>{t}</li>
                      ))}
                    </ul>
                  )}
                  <p className="text-[10px] text-slate-400 font-mono pt-1">
                    {a.model} · {formatDateTime(a.createdAt)}
                  </p>
                </div>
              ))}
            </section>
          )}

          <section className="bg-white border border-slate-200/80 rounded-xl p-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              Editorial Candidate
            </h2>
            {candidate ? (
              <div className="space-y-2.5">
                <StatusBadge status={candidate.status} />
                <p className="text-sm font-bold text-slate-900 leading-snug">{candidate.headline}</p>
                <p className="text-xs text-slate-600 leading-relaxed">{candidate.summary}</p>
                <p className="text-[11px] text-slate-400">
                  Category: <span className="font-semibold text-slate-600">{candidate.category}</span> ·{" "}
                  {Math.round(candidate.confidence * 100)}% confidence
                </p>
                {candidate.rejectionReason && (
                  <p className="text-[11px] text-rose-600">Reason: {candidate.rejectionReason}</p>
                )}

                {candidate.articleId ? (
                  <Link
                    href={`/admin/news?articleId=${candidate.articleId}`}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1769E0] hover:underline"
                  >
                    View Article Draft <ExternalLink className="h-3 w-3" />
                  </Link>
                ) : (
                  canDraft && (
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => runAction(() => createDraftFromSourceItem(item.id))}
                        disabled={busy}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-[#1769E0] text-white hover:bg-[#1357bd] transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                        Create Draft
                      </button>
                      <button
                        onClick={() => runAction(() => ignoreSourceItem(item.id))}
                        disabled={busy}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold border border-slate-200 text-slate-600 hover:text-rose-600 hover:border-rose-300 transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Ignore
                      </button>
                    </div>
                  )
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-500">
                No candidate yet — this item has not been routed to REVIEW or CREATE_DRAFT.
              </p>
            )}

            <button
              onClick={() => runAction(() => reclassifySourceItem(item.id))}
              disabled={busy}
              className="mt-3 w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold border border-slate-200 text-slate-600 hover:text-[#1769E0] hover:border-[#1769E0] transition-colors disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${busy ? "animate-spin" : ""}`} />
              Reclassify
            </button>
          </section>

          {item.articleLinks.length > 0 && (
            <section className="bg-white border border-slate-200/80 rounded-xl p-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Article Provenance</h2>
              <div className="space-y-2">
                {item.articleLinks.map((link) => (
                  <Link
                    key={link.id}
                    href={`/admin/news?articleId=${link.article.id}`}
                    className="flex items-center justify-between gap-2 text-xs hover:text-[#1769E0] transition-colors"
                  >
                    <span className="truncate">{link.article.headline}</span>
                    <StatusBadge status={link.article.status} size="sm" />
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
