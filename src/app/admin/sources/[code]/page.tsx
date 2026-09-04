"use client";

/**
 * Source detail / operations screen (Blueprint 13.3).
 *
 * Two halves that answer different questions. The left is operational — is this
 * source working, when did it last succeed, where is its cursor, what failed.
 * The right is configuration and provenance — what it is, how often it runs,
 * and which Appendix A entry authorises it.
 *
 * The configuration half comes from the registry snapshot rather than the
 * database: the registry is what the worker will actually load, so showing the
 * database's copy could tell an operator a schedule that is not the one running.
 */

import { use, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  CalendarClock,
  ExternalLink,
  ListTree,
  RefreshCw,
  Rewind,
  Stethoscope,
} from "lucide-react";

import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import {
  ActionButton,
  Field,
  HealthBadge,
  NoticeBar,
  OriginNotice,
  Panel,
  RunBadge,
} from "@/components/admin/ingestion/IngestionUi";
import { GEO_META, getCatalogSources, TRANSPORT_LABELS } from "@/lib/content-sources";
import {
  formatDateTime,
  formatDuration,
  formatRelative,
  getSourceDetail,
  type SourceDetailRow,
} from "@/lib/ingestion-admin";
import {
  runHealthcheck,
  triggerBackfill,
  triggerReconcile,
  triggerSync,
} from "@/lib/ingestion-api";

type Busy = "sync" | "reconcile" | "backfill" | "health" | null;

export default function AdminSourceDetailPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = use(params);

  const [source, setSource] = useState<SourceDetailRow | null>(null);
  const [originNotice, setOriginNotice] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ text: string; tone: "info" | "success" | "error" } | null>(
    null
  );
  const [busy, setBusy] = useState<Busy>(null);

  // The registry snapshot is authoritative for configuration; the API is
  // authoritative for operational state. Neither substitutes for the other.
  const config = useMemo(
    () => getCatalogSources().find((entry) => entry.code === code) ?? null,
    [code]
  );

  /**
   * Loading is derived from "which query have we finished?" rather than kept
   * as its own flag. Two pieces of state that must agree is one more than
   * needed, and setting a flag synchronously inside the effect would make the
   * mount render twice for nothing.
   */
  const queryKey = code;
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const loading = loadedKey !== queryKey;

  const load = useCallback(async () => {
    const result = await getSourceDetail(code);
    setSource(result.data);
    setOriginNotice(result.origin === "FALLBACK" ? (result.notice ?? "") : null);
    setLoadedKey(queryKey);
  }, [code, queryKey]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- `load` fetches, then sets state; the rule targets synchronous state sync, and an effect is where a client-rendered admin screen is meant to start a fetch.
    void load();
  }, [load]);

  /** Manual refresh: drop the loaded marker so the spinner shows again. */
  const refresh = () => {
    setLoadedKey(null);
    void load();
  };

  const act = async (
    kind: Exclude<Busy, null>,
    run: () => Promise<{ accepted: boolean; notice: string }>
  ) => {
    setBusy(kind);
    const result = await run();
    setNotice({ text: result.notice, tone: result.accepted ? "success" : "error" });
    setBusy(null);
    if (result.accepted) await load();
  };

  const geo = config ? GEO_META[config.geo] : null;
  const syncState = source?.syncState ?? null;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={config?.name ?? source?.name ?? code}
        description={
          config
            ? `${geo?.flag ?? ""} ${geo?.label ?? ""} · ${TRANSPORT_LABELS[config.transport]} · ${config.owner}`
            : "This source is not in the Phase 1 registry snapshot."
        }
        backHref="/admin/sources"
        backLabel="Back to automated sources"
      >
        {config && (
          <a
            href={config.officialUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
          >
            <ExternalLink className="h-3.5 w-3.5 text-slate-500" />
            Official endpoint
          </a>
        )}
        <Link
          href={`/admin/source-items?source=${encodeURIComponent(code)}`}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
        >
          <ListTree className="h-3.5 w-3.5 text-slate-500" />
          Items
        </Link>
      </AdminPageHeader>

      {originNotice !== null && <OriginNotice notice={originNotice} />}
      {notice && (
        <NoticeBar notice={notice.text} tone={notice.tone} onDismiss={() => setNotice(null)} />
      )}

      {/* ---------- Operations controls ---------- */}
      <div className="flex flex-wrap items-center gap-2">
        <ActionButton
          label="Sync now"
          icon={RefreshCw}
          tone="primary"
          busy={busy === "sync"}
          onClick={() => void act("sync", () => triggerSync(code))}
          title="Enqueue a manual discovery run. Express never fetches the source itself."
        />
        <ActionButton
          label="Reconcile"
          icon={Activity}
          busy={busy === "reconcile"}
          onClick={() => void act("reconcile", () => triggerReconcile(code))}
          title="Compare the last 7 days against the source and repair gaps"
        />
        <ActionButton
          label="Backfill 90 days"
          icon={Rewind}
          busy={busy === "backfill"}
          onClick={() => void act("backfill", () => triggerBackfill(code, { windowDays: 7 }))}
          title="Partition the last 90 days into 7-day windows and enqueue them"
        />
        <ActionButton
          label="Healthcheck"
          icon={Stethoscope}
          busy={busy === "health"}
          onClick={() =>
            void act("health", async () => {
              const result = await runHealthcheck(code);
              return {
                accepted: result.accepted,
                notice: result.data
                  ? `${result.data.state}${result.data.latencyMs ? ` in ${result.data.latencyMs} ms` : ""}${
                      result.data.message ? ` — ${result.data.message}` : ""
                    }`
                  : result.notice,
              };
            })
          }
          title="Call the adapter's healthcheck against the live endpoint now"
        />
        <button
          onClick={refresh}
          className="ml-auto inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Reload
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ---------- Sync state ---------- */}
        <Panel
          title="Sync state"
          action={source ? <HealthBadge status={source.health} /> : null}
        >
          {!source ? (
            <p className="text-xs text-slate-500">
              {loading
                ? "Loading…"
                : "This source has no database record yet. Seed the registry from Automated Sources, then run a sync."}
            </p>
          ) : (
            <dl className="grid grid-cols-2 gap-4">
              <Field
                label="Last success"
                value={`${formatDateTime(source.lastSyncedAt)}${
                  source.lastSyncedAt ? ` (${formatRelative(source.lastSyncedAt)})` : ""
                }`}
              />
              <Field
                label="Freshness lag"
                value={
                  source.freshnessLagMinutes === null
                    ? "—"
                    : `${source.freshnessLagMinutes} min${
                        config ? ` / SLA ${config.freshnessSlaMinutes} min` : ""
                      }`
                }
                title="Minutes since the last successful run, against the configured SLA"
              />
              <Field label="Cursor" value={syncState?.cursor ?? "—"} mono />
              <Field label="Watermark" value={formatDateTime(syncState?.watermark)} mono />
              <Field label="ETag" value={syncState?.etag ?? "—"} mono title={syncState?.etag ?? undefined} />
              <Field label="Last-Modified" value={syncState?.lastModified ?? "—"} mono />
              <Field label="Consecutive failures" value={syncState?.consecutiveFailures ?? 0} />
              <Field label="Last failure" value={formatDateTime(syncState?.lastFailureAt)} />
              {syncState?.lastErrorMessage && (
                <div className="col-span-2 rounded-lg border border-rose-200/80 bg-rose-50 px-3 py-2 text-xs text-rose-800">
                  {syncState.lastErrorMessage}
                </div>
              )}
            </dl>
          )}
        </Panel>

        {/* ---------- Configuration ---------- */}
        <Panel title="Configuration & provenance">
          {!config ? (
            <p className="text-xs text-slate-500">
              No registry entry for <code className="font-mono">{code}</code>. Every source must be
              traceable to the Phase 1 registry.
            </p>
          ) : (
            <dl className="grid grid-cols-2 gap-4">
              <Field label="Adapter family" value={config.family} />
              <Field label="Transport" value={TRANSPORT_LABELS[config.transport]} />
              <Field label="Cadence" value={config.cadence} title={`${config.cadenceMinutes} minutes`} />
              <Field label="Priority" value={config.priority} />
              <Field label="Backfill depth" value={config.backfillDepth} />
              <Field label="Reconcile" value={config.reconcile} />
              <Field label="Enabled" value={config.enabled ? "yes" : "no (configured, held off)"} />
              <Field label="Owner" value={config.owner} />
              <div className="col-span-2">
                <dt className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Appendix A reference
                </dt>
                <dd className="flex flex-wrap items-center gap-1.5 text-xs">
                  {config.references.length > 0 ? (
                    config.references.map((reference) => (
                      <span
                        key={reference}
                        className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-600"
                      >
                        {reference}
                      </span>
                    ))
                  ) : (
                    <span className="text-slate-500">
                      {config.appendixExempt
                        ? "Exempt — named in the Blueprint without a dedicated Appendix A entry"
                        : "None recorded"}
                    </span>
                  )}
                </dd>
              </div>
              <div className="col-span-2">
                <Field label="Official URL" value={config.officialUrl} mono title={config.officialUrl} />
              </div>
            </dl>
          )}
        </Panel>
      </div>

      {/* ---------- Recent runs ---------- */}
      <Panel
        title="Recent runs"
        action={
          <Link
            href={`/admin/source-runs?source=${encodeURIComponent(code)}`}
            className="text-[11px] font-semibold uppercase tracking-wider text-[#1769E0] hover:underline"
          >
            All runs
          </Link>
        }
      >
        {!source?.runs?.length ? (
          <p className="flex items-center gap-2 text-xs text-slate-500">
            <CalendarClock className="h-3.5 w-3.5" />
            No runs recorded. Trigger a sync to create one.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="py-2 pr-3">Started</th>
                  <th className="py-2 pr-3">Type</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Duration</th>
                  <th className="py-2 pr-3">Found</th>
                  <th className="py-2 pr-3">Created</th>
                  <th className="py-2 pr-3">Updated</th>
                  <th className="py-2">Failed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {source.runs.map((run) => (
                  <tr key={run.id}>
                    <td className="py-2.5 pr-3 whitespace-nowrap text-slate-600">
                      {formatDateTime(run.startedAt)}
                    </td>
                    <td className="py-2.5 pr-3 font-mono text-[11px] text-slate-500">{run.runType}</td>
                    <td className="py-2.5 pr-3">
                      <RunBadge status={run.status} />
                    </td>
                    <td className="py-2.5 pr-3 text-slate-600">
                      {formatDuration(run.startedAt, run.finishedAt)}
                    </td>
                    <td className="py-2.5 pr-3 tabular-nums text-slate-700">{run.itemsFound}</td>
                    <td className="py-2.5 pr-3 tabular-nums text-slate-700">{run.itemsCreated}</td>
                    <td className="py-2.5 pr-3 tabular-nums text-slate-700">{run.itemsUpdated}</td>
                    <td className="py-2.5 tabular-nums text-slate-700">
                      {run.itemsFailed > 0 ? (
                        <span className="font-semibold text-rose-600">{run.itemsFailed}</span>
                      ) : (
                        0
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
