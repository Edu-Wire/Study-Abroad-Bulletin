"use client";

/**
 * Source Health — Blueprint 14.1, one screen.
 *
 * Freshness is measured against each source's own configured SLA rather than a
 * single global threshold: a CRITICAL rule-page watch running every 15 minutes
 * and a monthly dataset are both "healthy" at wildly different lags, and one
 * shared number would flag the wrong one.
 *
 * The healthcheck button is a live call to the source's own endpoint. Use it
 * when a source looks stale and you need to know whether the endpoint is down or
 * the worker simply has not run.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { HeartPulse, RefreshCw, Stethoscope } from "lucide-react";

import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminTableContainer, AdminEmptyState } from "@/components/admin/AdminTable";
import {
  ActionButton,
  HealthBadge,
  NoticeBar,
  OriginNotice,
} from "@/components/admin/ingestion/IngestionUi";
import { getCatalogSources, type ContentSource } from "@/lib/content-sources";
import {
  formatDateTime,
  formatRelative,
  getSourceHealth,
  type SyncStateRow,
} from "@/lib/ingestion-admin";
import { runHealthcheck } from "@/lib/ingestion-api";

interface HealthRow {
  code: string;
  name: string;
  config: ContentSource | null;
  state: SyncStateRow | null;
  /** Minutes since the last success, or null when it has never succeeded. */
  lagMinutes: number | null;
  /** True when the lag exceeds this source's own configured SLA. */
  breachesSla: boolean;
}

function lagMinutes(lastSuccessAt: string | null): number | null {
  if (!lastSuccessAt) return null;
  const then = new Date(lastSuccessAt).getTime();
  if (Number.isNaN(then)) return null;
  return Math.max(0, Math.round((Date.now() - then) / 60_000));
}

export default function AdminSourceHealthPage() {
  const [states, setStates] = useState<SyncStateRow[]>([]);
  const [originNotice, setOriginNotice] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ text: string; tone: "info" | "success" | "error" } | null>(
    null
  );
  const [probing, setProbing] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const catalog = useMemo(() => getCatalogSources(), []);

  /**
   * Loading is derived from "which query have we finished?" rather than kept
   * as its own flag. Two pieces of state that must agree is one more than
   * needed, and setting a flag synchronously inside the effect would make the
   * mount render twice for nothing.
   */
  const queryKey = "source-health";
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const loading = loadedKey !== queryKey;

  const load = useCallback(async () => {
    const result = await getSourceHealth();
    setStates(result.data);
    setOriginNotice(result.origin === "FALLBACK" ? (result.notice ?? "") : null);
    setLoadedKey(queryKey);
  }, [queryKey]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- `load` fetches, then sets state; the rule targets synchronous state sync, and an effect is where a client-rendered admin screen is meant to start a fetch.
    void load();
  }, [load]);

  /** Manual refresh: drop the loaded marker so the spinner shows again. */
  const refresh = () => {
    setLoadedKey(null);
    void load();
  };

  /**
   * The catalog is the row set, joined with whatever sync state exists. A source
   * the worker has never touched must still appear — "never run" is the most
   * important health state on this screen and it has no row of its own.
   */
  const rows: HealthRow[] = useMemo(() => {
    const byCode = new Map(
      states
        .filter((state) => state.contentSource?.code)
        .map((state) => [state.contentSource!.code, state])
    );

    return catalog.map((config) => {
      const state = byCode.get(config.code) ?? null;
      const lag = lagMinutes(state?.lastSuccessAt ?? null);
      return {
        code: config.code,
        name: config.name,
        config,
        state,
        lagMinutes: lag,
        breachesSla: lag !== null && lag > config.freshnessSlaMinutes,
      };
    });
  }, [catalog, states]);

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter(
      (row) => row.name.toLowerCase().includes(query) || row.code.toLowerCase().includes(query)
    );
  }, [rows, search]);

  const summary = useMemo(() => {
    const counts = { healthy: 0, degraded: 0, stale: 0, broken: 0, rateLimited: 0, neverRun: 0 };
    for (const row of rows) {
      if (!row.state) counts.neverRun += 1;
      else if (row.state.healthStatus === "HEALTHY") counts.healthy += 1;
      else if (row.state.healthStatus === "DEGRADED") counts.degraded += 1;
      else if (row.state.healthStatus === "STALE") counts.stale += 1;
      else if (row.state.healthStatus === "BROKEN") counts.broken += 1;
      else if (row.state.healthStatus === "RATE_LIMITED") counts.rateLimited += 1;
    }
    return counts;
  }, [rows]);

  const probe = async (code: string) => {
    setProbing(code);
    const result = await runHealthcheck(code);
    setNotice({
      text: result.data
        ? `${code}: ${result.data.state}${result.data.latencyMs ? ` in ${result.data.latencyMs} ms` : ""}${
            result.data.message ? ` — ${result.data.message}` : ""
          }`
        : result.notice,
      tone: result.accepted ? "success" : "error",
    });
    setProbing(null);
    if (result.accepted) await load();
  };

  const slaBreaches = rows.filter((row) => row.breachesSla).length;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Source Health"
        description="Freshness, failure counts and last-error detail for every configured source, measured against each source's own SLA."
        count={rows.length}
        countLabel="sources"
      >
        <button
          onClick={refresh}
          className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 text-slate-500 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </AdminPageHeader>

      {originNotice !== null && <OriginNotice notice={originNotice} />}
      {notice && (
        <NoticeBar notice={notice.text} tone={notice.tone} onDismiss={() => setNotice(null)} />
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <SummaryTile label="Healthy" value={summary.healthy} tone="text-emerald-700" />
        <SummaryTile label="Degraded" value={summary.degraded} tone="text-amber-700" />
        <SummaryTile label="Stale" value={summary.stale} tone="text-slate-600" />
        <SummaryTile label="Broken" value={summary.broken} tone="text-rose-700" />
        <SummaryTile label="Rate limited" value={summary.rateLimited} tone="text-orange-700" />
        <SummaryTile label="Never run" value={summary.neverRun} tone="text-slate-500" />
      </div>

      {slaBreaches > 0 && (
        <div className="rounded-lg border border-amber-200/80 bg-amber-50 px-4 py-2.5 text-xs font-medium text-amber-900">
          {slaBreaches} source{slaBreaches === 1 ? "" : "s"} outside the configured freshness SLA.
        </div>
      )}

      <AdminTableContainer
        count={visible.length}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search sources..."
        footerNote="Health state is written by the worker after each run, and by an on-demand healthcheck."
      >
        {visible.length === 0 ? (
          <AdminEmptyState title="No sources" description="No source matches this search." icon={HeartPulse} />
        ) : (
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/75 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3">Source</th>
                <th className="px-3 py-3">Health</th>
                <th className="px-3 py-3">Last success</th>
                <th className="px-3 py-3">Lag / SLA</th>
                <th className="px-3 py-3 text-right">Failures</th>
                <th className="px-3 py-3">Last error</th>
                <th className="px-4 py-3 text-right">Probe</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visible.map((row) => (
                <tr key={row.code} className="transition-colors hover:bg-slate-50/70">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/sources/${row.code}`}
                      className="font-semibold text-slate-800 hover:text-[#1769E0] hover:underline"
                    >
                      {row.name}
                    </Link>
                    <div className="font-mono text-[11px] text-slate-400">{row.code}</div>
                  </td>
                  <td className="px-3 py-3">
                    {row.state ? (
                      <HealthBadge status={row.state.healthStatus} />
                    ) : (
                      <span className="text-[11px] text-slate-400">never run</span>
                    )}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-slate-600">
                    {row.state?.lastSuccessAt ? formatRelative(row.state.lastSuccessAt) : "—"}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap tabular-nums">
                    <span className={row.breachesSla ? "font-semibold text-amber-700" : "text-slate-600"}>
                      {row.lagMinutes === null ? "—" : `${row.lagMinutes} min`}
                    </span>
                    <span className="text-slate-400"> / {row.config?.freshnessSlaMinutes ?? "—"}</span>
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    {row.state?.consecutiveFailures ? (
                      <span className="font-semibold text-rose-600">
                        {row.state.consecutiveFailures}
                      </span>
                    ) : (
                      <span className="text-slate-500">0</span>
                    )}
                  </td>
                  <td className="max-w-xs px-3 py-3">
                    {row.state?.lastErrorMessage ? (
                      <span
                        className="block truncate text-[11px] text-rose-700"
                        title={`${row.state.lastErrorMessage} (${formatDateTime(row.state.lastFailureAt)})`}
                      >
                        {row.state.lastErrorMessage}
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end">
                      <ActionButton
                        label="Check"
                        icon={Stethoscope}
                        busy={probing === row.code}
                        onClick={() => void probe(row.code)}
                        title="Call the adapter's healthcheck against the live endpoint now"
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </AdminTableContainer>
    </div>
  );
}

function SummaryTile({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white px-3 py-2.5">
      <div className={`text-lg font-bold tabular-nums ${tone}`}>{value}</div>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</div>
    </div>
  );
}
