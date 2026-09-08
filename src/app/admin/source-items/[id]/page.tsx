"use client";

/**
 * Source item detail — the candidate card of Blueprint 13.2, plus everything an
 * editor needs to check the machine's work before acting on it.
 *
 * The order on the page is the order of the decision: what the source said,
 * what the pipeline concluded, why, and only then the two buttons. "Create
 * draft" and "Ignore" sit below the full source and the reasoning on purpose —
 * the whole point of the programme is that nobody drafts from a headline.
 */

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Ban,
  ExternalLink,
  FileText,
  History,
  RefreshCw,
  Sparkles,
} from "lucide-react";

import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import {
  ActionButton,
  CandidateBadge,
  CategoryBadge,
  NoticeBar,
  OriginNotice,
  Panel,
  ProcessingBadge,
  RouteBadge,
  ScoreBar,
  Field,
} from "@/components/admin/ingestion/IngestionUi";
import {
  canAutoDraft,
  editorialLane,
  formatDateTime,
  getSourceItem,
  laneExplanation,
  toScore,
  type SourceItemDetail,
} from "@/lib/ingestion-admin";
import { createDraft, ignoreItem, reclassifyItem } from "@/lib/ingestion-api";

type Busy = "draft" | "ignore" | "reclassify" | null;

export default function AdminSourceItemDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [item, setItem] = useState<SourceItemDetail | null>(null);
  const [originNotice, setOriginNotice] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ text: string; tone: "info" | "success" | "error" } | null>(
    null
  );
  const [busy, setBusy] = useState<Busy>(null);
  const [ignoreReason, setIgnoreReason] = useState("");
  const [showFullSource, setShowFullSource] = useState(false);

  /**
   * Loading is derived from "which query have we finished?" rather than kept
   * as its own flag. Two pieces of state that must agree is one more than
   * needed, and setting a flag synchronously inside the effect would make the
   * mount render twice for nothing.
   */
  const queryKey = id;
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const loading = loadedKey !== queryKey;

  const load = useCallback(async () => {
    const result = await getSourceItem(id);
    setItem(result.data);
    setOriginNotice(result.origin === "FALLBACK" ? (result.notice ?? "") : null);
    setLoadedKey(queryKey);
  }, [id, queryKey]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- `load` fetches, then sets state; the rule targets synchronous state sync, and an effect is where a client-rendered admin screen is meant to start a fetch.
    void load();
  }, [load]);

  /** Manual refresh: drop the loaded marker so the spinner shows again. */
  const refresh = () => {
    setLoadedKey(null);
    void load();
  };

  const assessment = item?.assessments?.[0];
  const raw = assessment?.rawOutput ?? null;
  const latestVersion = item?.versions?.[0] ?? null;
  const candidate = item?.candidate ?? null;

  /** Run a mutation, report exactly what the API said, then reload. */
  const act = async (kind: Exclude<Busy, null>, run: () => Promise<{ accepted: boolean; notice: string }>) => {
    setBusy(kind);
    const result = await run();
    setNotice({ text: result.notice, tone: result.accepted ? "success" : "error" });
    setBusy(null);
    if (result.accepted) await load();
  };

  if (loading) {
    return <p className="py-16 text-center text-xs text-slate-500">Loading source item…</p>;
  }

  if (!item) {
    return (
      <div className="space-y-4">
        <AdminPageHeader
          title="Source item"
          description="This item could not be loaded."
          backHref="/admin/source-items"
          backLabel="Back to source items"
        />
        {originNotice !== null ? (
          <OriginNotice notice={originNotice} />
        ) : (
          <p className="text-xs text-slate-500">No item exists with id {id}.</p>
        )}
      </div>
    );
  }

  const draftBlocked = Boolean(assessment) && !canAutoDraft(assessment);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={item.title}
        description={`${item.contentSource.name} · ${item.externalId ?? "no external id"}`}
        backHref="/admin/source-items"
        backLabel="Back to source items"
      >
        <a
          href={item.canonicalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
        >
          <ExternalLink className="h-3.5 w-3.5 text-slate-500" />
          Official source
        </a>
      </AdminPageHeader>

      {originNotice !== null && <OriginNotice notice={originNotice} />}
      {notice && (
        <NoticeBar notice={notice.text} tone={notice.tone} onDismiss={() => setNotice(null)} />
      )}

      {/* Status strip */}
      <div className="flex flex-wrap items-center gap-2">
        <ProcessingBadge status={item.processingStatus} />
        {assessment && <RouteBadge lane={editorialLane(assessment)} />}
        {candidate && <CandidateBadge status={candidate.status} />}
        <CategoryBadge category={assessment?.suggestedCategory} reason={raw?.cmsCategoryReason} />
        <span className="text-[11px] text-slate-400">
          discovered {formatDateTime(item.discoveredAt)} · published {formatDateTime(item.publishedAt)}
        </span>
      </div>

      {assessment && laneExplanation(assessment) && (
        <p className="rounded-lg border border-slate-200/80 bg-slate-50/70 px-4 py-2.5 text-xs text-slate-700">
          <span className="font-semibold">Routing: </span>
          {laneExplanation(assessment)}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          {/* ---------- Full source ---------- */}
          <Panel
            title="Full source"
            action={
              latestVersion && (
                <button
                  onClick={() => setShowFullSource((current) => !current)}
                  className="cursor-pointer text-[11px] font-semibold uppercase tracking-wider text-[#1769E0] hover:underline"
                >
                  {showFullSource ? "Collapse" : "Expand"}
                </button>
              )
            }
          >
            {!latestVersion ? (
              <p className="text-xs text-slate-500">
                No stored version yet. The detail stage has not produced a document for this item —
                nothing can be drafted from it until it does.
              </p>
            ) : (
              <div className="space-y-3">
                <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <Field label="Version" value={`v${latestVersion.versionNumber}`} />
                  <Field label="Captured" value={formatDateTime(latestVersion.capturedAt)} />
                  <Field label="HTTP" value={latestVersion.httpStatus ?? "—"} />
                  <Field
                    label="Content hash"
                    value={latestVersion.contentHash.slice(0, 16)}
                    mono
                    title={latestVersion.contentHash}
                  />
                </dl>
                {/* Stored text, not the discovery summary: this is the document
                    the classifier actually read. */}
                <pre
                  className={`overflow-x-auto whitespace-pre-wrap break-words rounded-lg border border-slate-200/80 bg-slate-50/60 p-3 font-sans text-xs leading-relaxed text-slate-700 ${
                    showFullSource ? "" : "max-h-64 overflow-y-hidden"
                  }`}
                >
                  {latestVersion.cleanText?.trim() || "(no extracted text)"}
                </pre>
                {item.summary && (
                  <p className="text-[11px] text-slate-500">
                    <span className="font-semibold">Discovery summary: </span>
                    {item.summary}
                  </p>
                )}
              </div>
            )}
          </Panel>

          {/* ---------- AI assessment ---------- */}
          <Panel
            title="AI assessment"
            action={
              <ActionButton
                label="Reclassify"
                icon={RefreshCw}
                busy={busy === "reclassify"}
                onClick={() =>
                  void act("reclassify", () => reclassifyItem(item.id, latestVersion?.id))
                }
                title="Re-run the assessment against the latest stored version"
              />
            }
          >
            {!assessment ? (
              <p className="text-xs text-slate-500">
                Not assessed yet. Reclassify to run the prefilter, the model and the routing policy
                against the stored version.
              </p>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                  <ScoreBar label="Study abroad" value={raw?.studyAbroadRelevance} emphasis />
                  <ScoreBar label="Visa" value={raw?.visaRelevance} />
                  <ScoreBar label="International student" value={raw?.internationalStudentRelevance} />
                  <ScoreBar label="Post-study work" value={raw?.postStudyWorkRelevance} />
                  <ScoreBar label="Scholarship" value={raw?.scholarshipRelevance} />
                  <ScoreBar label="Policy impact" value={raw?.policyImpact} />
                  <ScoreBar
                    label="Confidence"
                    value={raw?.confidence ?? toScore(assessment.confidenceScore)}
                    emphasis
                  />
                  <ScoreBar label="Urgency" value={raw?.urgency} />
                </div>

                <dl className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-3 sm:grid-cols-4">
                  <Field label="Internal category" value={assessment.internalCategory} />
                  <Field
                    label="CMS category"
                    value={<CategoryBadge category={assessment.suggestedCategory} reason={raw?.cmsCategoryReason} />}
                  />
                  <Field label="Model" value={assessment.model} mono />
                  <Field label="Prompt" value={assessment.promptVersion} mono />
                </dl>

                {raw?.reasoningSummary && (
                  <div className="rounded-lg border border-blue-200/70 bg-blue-50/60 p-3">
                    <p className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#1769E0]">
                      <Sparkles className="h-3 w-3" />
                      Reasoning summary
                    </p>
                    <p className="text-xs leading-relaxed text-slate-700">{raw.reasoningSummary}</p>
                  </div>
                )}

                {(assessment.keyTakeaways.length > 0 || raw?.reasonCodes?.length) && (
                  <div className="flex flex-wrap gap-1.5">
                    {(raw?.reasonCodes ?? assessment.keyTakeaways).map((code) => (
                      <span
                        key={code}
                        className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-600"
                      >
                        {code}
                      </span>
                    ))}
                  </div>
                )}

                {raw?.effectiveDates && raw.effectiveDates.length > 0 && (
                  <div className="space-y-1 border-t border-slate-100 pt-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      Effective dates
                    </p>
                    {raw.effectiveDates.map((entry, index) => (
                      <p key={index} className="text-xs text-slate-700">
                        <span className="font-mono text-[11px] text-slate-500">
                          {entry.kind ?? "UNKNOWN"}
                        </span>{" "}
                        — {entry.raw}
                        {/* The raw wording is kept so an editor can check the parse. */}
                      </p>
                    ))}
                  </div>
                )}

                {(raw?.prefilterMatchedBoost?.length || raw?.prefilterMatchedNegative?.length) && (
                  <div className="border-t border-slate-100 pt-3 text-[11px] text-slate-500">
                    <span className="font-semibold">Prefilter</span> (score {raw?.prefilterScore ?? "—"}
                    ):{" "}
                    {raw?.prefilterMatchedBoost?.length
                      ? `matched ${raw.prefilterMatchedBoost.join(", ")}`
                      : "no boost terms"}
                    {raw?.prefilterMatchedNegative?.length
                      ? ` · negative ${raw.prefilterMatchedNegative.join(", ")}`
                      : ""}
                  </div>
                )}
              </div>
            )}
          </Panel>

          {/* ---------- Versions and changes ---------- */}
          <Panel title={`Version history (${item.versions.length})`}>
            {item.versions.length === 0 ? (
              <p className="text-xs text-slate-500">No versions stored.</p>
            ) : (
              <ul className="space-y-2">
                {item.versions.map((version) => (
                  <li
                    key={version.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200/80 px-3 py-2 text-xs"
                  >
                    <span className="flex items-center gap-2">
                      <History className="h-3.5 w-3.5 text-slate-400" />
                      <span className="font-semibold text-slate-800">v{version.versionNumber}</span>
                      <span className="font-mono text-[11px] text-slate-400">
                        {version.contentHash.slice(0, 12)}
                      </span>
                    </span>
                    <span className="text-slate-500">{formatDateTime(version.capturedAt)}</span>
                    {version.diffsFromPrior && version.diffsFromPrior.length > 0 && (
                      <span className="w-full text-[11px] text-slate-600">
                        {version.diffsFromPrior.map((diff) => (
                          <span key={diff.id} className="block">
                            {diff.isMaterial ? (
                              <span className="font-semibold text-amber-700">material change</span>
                            ) : (
                              <span className="text-slate-500">minor change</span>
                            )}
                            {diff.changeSummary ? ` — ${diff.changeSummary}` : ""}
                          </span>
                        ))}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        {/* ---------- Sidebar: editorial actions ---------- */}
        <aside className="space-y-6">
          <Panel title="Editorial actions">
            <div className="space-y-3">
              {candidate?.articleId ? (
                <p className="rounded-lg border border-emerald-200/80 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                  A draft already exists in the CMS.{" "}
                  <Link href="/admin/news" className="font-semibold underline">
                    Open it in News
                  </Link>
                  .
                </p>
              ) : !candidate ? (
                <p className="text-xs text-slate-500">
                  No candidate. The pipeline routed this item away from the editorial queue; the
                  assessment above says why. Reclassify to reconsider it.
                </p>
              ) : (
                <>
                  {draftBlocked && (
                    <p className="flex items-start gap-2 rounded-lg border border-amber-200/80 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span>
                        {raw?.cmsCategoryReason ??
                          "The classifier resolved no CMS category for this item."}{" "}
                        Drafting is blocked until a category is chosen.
                      </span>
                    </p>
                  )}

                  <ActionButton
                    label="Create draft"
                    icon={FileText}
                    tone="primary"
                    busy={busy === "draft"}
                    disabled={draftBlocked || candidate.status === "IGNORED"}
                    onClick={() => void act("draft", () => createDraft(item.id))}
                    title="Create a DRAFT article in the CMS. A human publishes it."
                  />

                  <div className="space-y-2 border-t border-slate-100 pt-3">
                    <label
                      htmlFor="ignore-reason"
                      className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400"
                    >
                      Reason for ignoring
                    </label>
                    <input
                      id="ignore-reason"
                      value={ignoreReason}
                      onChange={(event) => setIgnoreReason(event.target.value)}
                      placeholder="e.g. domestic policy, no student impact"
                      className="w-full rounded-lg border border-slate-200 bg-slate-50/70 px-2.5 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-[#1769E0] focus:bg-white focus:outline-none"
                    />
                    <ActionButton
                      label="Ignore candidate"
                      icon={Ban}
                      tone="danger"
                      busy={busy === "ignore"}
                      disabled={candidate.status === "IGNORED"}
                      onClick={() =>
                        void act("ignore", () =>
                          ignoreItem(item.id, ignoreReason.trim() || "Dismissed by editor")
                        )
                      }
                      title="Dismiss the candidate. The source item, its versions and its assessments are retained."
                    />
                    {candidate.status === "IGNORED" && candidate.rejectionReason && (
                      <p className="text-[11px] text-slate-500">
                        Ignored: {candidate.rejectionReason}
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
          </Panel>

          <Panel title="Provenance">
            <dl className="space-y-3">
              <Field
                label="Source"
                value={
                  <Link
                    href={`/admin/sources/${item.contentSource.code}`}
                    className="text-[#1769E0] hover:underline"
                  >
                    {item.contentSource.name}
                  </Link>
                }
              />
              <Field label="Source code" value={item.contentSource.code} mono />
              <Field label="External id" value={item.externalId ?? "—"} mono />
              <Field label="Canonical URL" value={item.canonicalUrl} mono title={item.canonicalUrl} />
              <Field label="Language" value={item.language ?? "—"} />
              <Field
                label="Detail status"
                value={String(item.rawMetadata?.detailStatus ?? "—")}
                title="Anything but ENRICHED caps the routing lane at REVIEW"
              />
              {item.nativeTopics.length > 0 && (
                <div>
                  <dt className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Native topics
                  </dt>
                  <dd className="flex flex-wrap gap-1">
                    {/* The source's own taxonomy. Never our editorial category. */}
                    {item.nativeTopics.map((topic) => (
                      <span
                        key={topic}
                        className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600"
                      >
                        {topic}
                      </span>
                    ))}
                  </dd>
                </div>
              )}
            </dl>
          </Panel>

          {item.articleLinks.length > 0 && (
            <Panel title="Linked articles">
              <ul className="space-y-2">
                {item.articleLinks.map((link) => (
                  <li key={link.id} className="text-xs">
                    <span className="font-semibold text-slate-800">{link.article.headline}</span>
                    <span className="ml-1.5 font-mono text-[10px] uppercase text-slate-400">
                      {link.article.status}
                    </span>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </aside>
      </div>
    </div>
  );
}
