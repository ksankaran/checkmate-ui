"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  CheckCircle2,
  XCircle,
  Clock,
  FlaskConical,
  RefreshCw,
  AlertTriangle,
  TrendingUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface DashboardData {
  kpis: {
    total_tests: number;
    executed_pct: number;
    pass_rate: number;
    fail_count: number;
    avg_duration_ms: number;
  };
  status_breakdown: { passed: number; failed: number; not_run: number };
  daily_runs: { date: string; passed: number; failed: number }[];
  module_health: { module: string; passed: number; failed: number; not_run: number }[];
  browser_stats: { browser: string; count: number; passed: number }[];
  recent_runs: {
    id: number;
    test_case_name: string;
    status: string;
    browser: string | null;
    created_at: string;
    duration_ms: number | null;
  }[];
  top_bottlenecks: { module: string; fail_rate: number; failed: number; total: number }[];
  release_recommendation: "GO" | "NO-GO" | "CONDITIONAL";
}

// ---------------------------------------------------------------------------
// Color palette
// ---------------------------------------------------------------------------
const COLOR_PASS = "#22c55e";
const COLOR_FAIL = "#ef4444";
const COLOR_NOTRUN = "#6b7280";
const COLOR_BRAND = "hsl(207 100% 50%)";

const BROWSER_COLORS = [
  "#3b82f6", "#8b5cf6", "#f59e0b", "#14b8a6", "#ec4899", "#f97316",
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function fmtDuration(ms: number | null): string {
  if (!ms) return "—";
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function shortDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------
function KpiCard({
  label,
  value,
  sub,
  icon,
  color,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-5 flex items-start gap-4 shadow-sm">
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
        style={{ background: color + "20", color }}
      >
        {icon}
      </div>
      <div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {label}
        </p>
        <p className="text-2xl font-bold mt-0.5">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
      {children}
    </h2>
  );
}

function ChartCard({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-xl border bg-card p-5 shadow-sm", className)}>
      <SectionTitle>{title}</SectionTitle>
      {children}
    </div>
  );
}

function StatusBadgeSmall({ status }: { status: string }) {
  if (status === "passed")
    return (
      <Badge className="bg-green-500/15 text-green-600 border-0 text-xs">Passed</Badge>
    );
  if (status === "failed")
    return (
      <Badge className="bg-red-500/15 text-red-500 border-0 text-xs">Failed</Badge>
    );
  return <Badge variant="secondary" className="text-xs">{status}</Badge>;
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function ProjectDashboardPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/projects/${id}/dashboard`
      );
      if (!res.ok) throw new Error("Failed to fetch dashboard");
      setData(await res.json());
      setLastRefreshed(new Date());
    } catch {
      // keep stale data visible
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  // Relative refresh label
  const refreshLabel = lastRefreshed
    ? (() => {
        const secs = Math.floor((Date.now() - lastRefreshed.getTime()) / 1000);
        if (secs < 60) return "just now";
        if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
        return `${Math.floor(secs / 3600)}h ago`;
      })()
    : null;

  // Empty state
  const hasNoRuns =
    data &&
    data.kpis.fail_count === 0 &&
    data.status_breakdown.passed === 0 &&
    data.status_breakdown.failed === 0;

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Project Dashboard</h1>
        <div className="flex items-center gap-3">
          {refreshLabel && (
            <span className="text-xs text-muted-foreground">
              Last refreshed {refreshLabel}
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={load}
            disabled={loading}
            className="gap-1.5"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {(!mounted || (loading && !data)) && (
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-xl border bg-card p-5 h-24 animate-pulse" />
          ))}
        </div>
      )}

      {mounted && data && (
        <>
          {/* Empty state */}
          {hasNoRuns && (
            <div className="rounded-xl border bg-card p-12 flex flex-col items-center gap-3 text-center">
              <FlaskConical className="h-12 w-12 text-muted-foreground/40" />
              <p className="text-lg font-medium">No runs yet</p>
              <p className="text-sm text-muted-foreground max-w-sm">
                Run your first test to see insights here. Go to Executions or open a
                scenario to get started.
              </p>
            </div>
          )}

          {/* KPI row */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <KpiCard
              label="Total Tests"
              value={data.kpis.total_tests}
              sub={`${data.kpis.executed_pct}% executed (30d)`}
              icon={<FlaskConical className="h-5 w-5" />}
              color={COLOR_BRAND}
            />
            <KpiCard
              label="Pass Rate"
              value={`${data.kpis.pass_rate}%`}
              sub="last 30 days"
              icon={<CheckCircle2 className="h-5 w-5" />}
              color={COLOR_PASS}
            />
            <KpiCard
              label="Failures (30d)"
              value={data.kpis.fail_count}
              sub="failed runs"
              icon={<XCircle className="h-5 w-5" />}
              color={COLOR_FAIL}
            />
            <KpiCard
              label="Avg Duration"
              value={fmtDuration(data.kpis.avg_duration_ms)}
              sub="per completed run"
              icon={<Clock className="h-5 w-5" />}
              color="#f59e0b"
            />
          </div>

          {/* Row 2: [Trend + Module Health] | [Status Breakdown + Browser Usage] | [Recent Runs] */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[428px_428px_450px]">

            {/* Col 1: Trend stacked above Module Health */}
            <div className="flex flex-col gap-4">
              <ChartCard title="14-day Pass / Fail Trend">
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={data.daily_runs} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <XAxis
                      dataKey="date"
                      tickFormatter={shortDate}
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip labelFormatter={(label) => `Date: ${label}`} />
                    <Bar dataKey="passed" stackId="a" fill={COLOR_PASS} radius={[0, 0, 0, 0]} />
                    <Bar dataKey="failed" stackId="a" fill={COLOR_FAIL} radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Module Health by Tag">
                {data.module_health.filter((m) => m.passed + m.failed > 0).length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">No runs yet</p>
                ) : (
                  <div className="flex flex-col gap-2.5">
                    {data.module_health.filter((m) => m.passed + m.failed > 0).map((m) => {
                      const ran = m.passed + m.failed;
                      const total = ran + m.not_run;
                      const passRate = ran > 0 ? Math.round((m.passed / ran) * 100) : 0;
                      const failRate = ran > 0 ? Math.round((m.failed / ran) * 100) : 0;
                      const dotColor =
                        ran === 0 ? COLOR_NOTRUN
                        : passRate >= 80 ? COLOR_PASS
                        : passRate >= 50 ? "#f59e0b"
                        : COLOR_FAIL;
                      return (
                        <div key={m.module} className="flex items-center gap-3">
                          <div className="h-2 w-2 rounded-full shrink-0" style={{ background: dotColor }} />
                          <span className="text-sm w-28 shrink-0 truncate">{m.module}</span>
                          <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                            <div className="h-full flex">
                              <div className="h-full bg-green-500 transition-all" style={{ width: `${passRate}%` }} />
                              <div className="h-full bg-red-500 transition-all" style={{ width: `${failRate}%` }} />
                            </div>
                          </div>
                          <span className="text-xs text-muted-foreground shrink-0 w-24 text-right">
                            {ran === 0 ? `${m.not_run} not run` : `${m.passed}/${total} passed`}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ChartCard>
            </div>

            {/* Col 2: Status Breakdown stacked above Browser Usage */}
            <div className="flex flex-col gap-4">
              <ChartCard title="Status Breakdown">
                {data.status_breakdown.passed + data.status_breakdown.failed + data.status_breakdown.not_run === 0 ? (
                  <div className="flex h-[250px] items-center justify-center text-sm text-muted-foreground">
                    No data yet
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: "Passed", value: data.status_breakdown.passed },
                          { name: "Failed", value: data.status_breakdown.failed },
                          { name: "Not Run", value: data.status_breakdown.not_run },
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={88}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        <Cell fill={COLOR_PASS} />
                        <Cell fill={COLOR_FAIL} />
                        <Cell fill={COLOR_NOTRUN} />
                      </Pie>
                      <Legend
                        formatter={(value) => (
                          <span className="text-xs text-muted-foreground">{value}</span>
                        )}
                      />
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>

              <ChartCard title="Browser Usage">
                {data.browser_stats.length === 0 ? (
                  <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
                    No runs yet
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={data.browser_stats.map((b) => ({ name: b.browser, value: b.count }))}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={78}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {data.browser_stats.map((_, i) => (
                          <Cell key={i} fill={BROWSER_COLORS[i % BROWSER_COLORS.length]} />
                        ))}
                      </Pie>
                      <Legend
                        formatter={(value) => (
                          <span className="text-xs text-muted-foreground">{value}</span>
                        )}
                      />
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>
            </div>

            {/* Col 3: Recent Runs spanning full height */}
            <ChartCard title="Recent Runs" className="overflow-auto">
              {data.recent_runs.length === 0 ? (
                <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
                  No completed runs yet
                </div>
              ) : (
                <div className="flex flex-col divide-y divide-border -mx-1">
                  {data.recent_runs.map((run) => (
                    <div key={run.id} className="flex flex-col gap-0.5 px-1 py-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium truncate flex-1">
                          {run.test_case_name}
                        </span>
                        <StatusBadgeSmall status={run.status} />
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {run.browser && (
                          <span className="capitalize">{run.browser}</span>
                        )}
                        {run.browser && <span>·</span>}
                        <span>{fmtDate(run.created_at)}</span>
                        {run.duration_ms !== null && (
                          <>
                            <span>·</span>
                            <span className="flex items-center gap-0.5">
                              <TrendingUp className="h-2.5 w-2.5" />
                              {fmtDuration(run.duration_ms)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ChartCard>
          </div>

          {/* Row 4: Bottlenecks + GO/NO-GO */}
          <div className="grid grid-cols-1 gap-4">
            {/* Bottlenecks + Release banner */}
            <div className="flex flex-col gap-4">
              {/* Release recommendation banner */}
              <div
                className={cn(
                  "rounded-xl border p-5 flex items-center gap-4 shadow-sm",
                  data.release_recommendation === "GO" &&
                    "bg-green-500/10 border-green-500/30",
                  data.release_recommendation === "NO-GO" &&
                    "bg-red-500/10 border-red-500/30",
                  data.release_recommendation === "CONDITIONAL" &&
                    "bg-amber-500/10 border-amber-500/30",
                )}
              >
                <div
                  className={cn(
                    "flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-xl font-bold",
                    data.release_recommendation === "GO" &&
                      "bg-green-500 text-white",
                    data.release_recommendation === "NO-GO" &&
                      "bg-red-500 text-white",
                    data.release_recommendation === "CONDITIONAL" &&
                      "bg-amber-500 text-white",
                  )}
                >
                  {data.release_recommendation === "GO" && "✓"}
                  {data.release_recommendation === "NO-GO" && "✗"}
                  {data.release_recommendation === "CONDITIONAL" && "!"}
                </div>
                <div>
                  <p className="font-semibold text-lg">{data.release_recommendation}</p>
                  <p className="text-sm text-muted-foreground">
                    {data.release_recommendation === "GO" &&
                      `Pass rate ≥ 90% and coverage is strong. Ready to ship.`}
                    {data.release_recommendation === "NO-GO" &&
                      `Pass rate below 70% or too many failures. Not safe to release.`}
                    {data.release_recommendation === "CONDITIONAL" &&
                      `Some failures or untested areas. Review before releasing.`}
                  </p>
                </div>
              </div>

              {/* Top bottlenecks */}
              <ChartCard title="Top Bottlenecks">
                {data.top_bottlenecks.length === 0 ? (
                  <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">
                    No failures to report
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {data.top_bottlenecks.map((b) => (
                      <div key={b.module} className="flex items-center gap-3">
                        <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium truncate">{b.module}</span>
                            <span className="text-xs text-muted-foreground ml-2">
                              {b.failed}/{b.total}
                            </span>
                          </div>
                          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full bg-red-500 transition-all"
                              style={{ width: `${b.fail_rate}%` }}
                            />
                          </div>
                        </div>
                        <Badge
                          className={cn(
                            "shrink-0 text-xs",
                            b.fail_rate > 50
                              ? "bg-red-500/15 text-red-600 border-0"
                              : "bg-amber-500/15 text-amber-600 border-0",
                          )}
                        >
                          {b.fail_rate}%
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </ChartCard>
            </div>

          </div>
        </>
      )}
    </div>
  );
}
