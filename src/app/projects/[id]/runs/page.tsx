"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Clock,
  ChevronDown,
  ChevronRight,
  FolderOpen,
  Layers,
  Loader2,
  Trash2,
} from "lucide-react";
import { ThemeToggle } from "@/components/dashboard/ThemeToggle";
import { cn } from "@/lib/utils";
import { API_URL } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { toast } from "sonner";

interface TestCase {
  id: number;
  name: string;
  natural_query: string;
  priority: string;
  tags: string[] | string;
  test_case_number: number | null;
}

interface RunStep {
  id: number;
  step_number: number;
  action: string;
  target: string | null;
  value: string | null;
  status: string;
  duration: number | null;
  error: string | null;
  screenshot: string | null;
  fixture_name: string | null;
}

interface TestRun {
  id: number;
  test_case_id: number | null;
  project_id: number;
  trigger: string;
  thread_id: string | null;
  batch_label: string | null;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  summary: string | null;
  error_count: number;
  pass_count: number;
  created_at: string;
  browser: string | null;
}

interface TestRunWithSteps extends TestRun {
  steps: RunStep[];
}

interface GroupedRun {
  type: "suite" | "individual";
  batchId?: string;
  batchLabel?: string;
  runs: TestRun[];
  passCount: number;
  failCount: number;
  runningCount: number;
  cancelledCount: number;
  latestRun: TestRun;
}

const BROWSER_LABELS: Record<string, string> = {
  chromium: "Google Chrome",
  "chromium-headless": "Google Chrome (HL)",
  chrome: "Chrome",
  "chrome-headless": "Chrome (HL)",
  firefox: "Firefox",
  "firefox-headless": "Firefox (HL)",
  webkit: "Safari",
  "webkit-headless": "Safari (HL)",
};

const ACTION_LABELS: Record<string, string> = {
  navigate: "Navigate",
  click: "Click",
  type: "Type",
  fill_form: "Fill Form",
  select: "Select",
  hover: "Hover",
  press_key: "Press Key",
  wait: "Wait",
  wait_for_page: "Wait for Page",
  screenshot: "Screenshot",
  assert_text: "Assert Text",
  assert_element: "Assert Element",
  assert_style: "Assert Style",
  assert_url: "Assert URL",
  back: "Go Back",
  evaluate: "Evaluate JS",
  upload: "Upload",
  drag: "Drag & Drop",
};

function formatRelativeDate(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 30) return `${diffDay}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function ProjectRunsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const projectId = params.id as string;
  const targetRunId = searchParams.get("runId");
  const targetBatchId = searchParams.get("batchId");

  const [testRuns, setTestRuns] = useState<TestRun[]>([]);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [projectPrefix, setProjectPrefix] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedRuns, setExpandedRuns] = useState<Set<number>>(new Set());
  const [expandedSuites, setExpandedSuites] = useState<Set<string>>(new Set());
  const [runSteps, setRunSteps] = useState<Map<number, RunStep[]>>(new Map());
  const [loadingSteps, setLoadingSteps] = useState<Set<number>>(new Set());

  // Clear / delete state
  const [clearAllOpen, setClearAllOpen] = useState(false);
  const [clearingAll, setClearingAll] = useState(false);
  const [deletingRunId, setDeletingRunId] = useState<number | null>(null);

  const hasScrolled = useRef(false);
  const runRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const suiteRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  useEffect(() => {
    fetchTestRuns();
    fetchTestCases();
    fetchProjectPrefix();
  }, [projectId]);

  async function fetchProjectPrefix() {
    try {
      const res = await fetch(`${API_URL}/api/projects/${projectId}`);
      if (res.ok) {
        const data = await res.json();
        setProjectPrefix(data.test_case_prefix || null);
      }
    } catch (error) {
      console.error("Failed to fetch project:", error);
    }
  }

  // Auto-expand and scroll to target run/batch
  useEffect(() => {
    if (loading || hasScrolled.current) return;

    if (targetRunId) {
      const runId = parseInt(targetRunId);
      // Find which batch this run belongs to (if any)
      const run = testRuns.find((r) => r.id === runId);
      if (run?.thread_id?.startsWith("batch-")) {
        setExpandedSuites(new Set([run.thread_id]));
      }
      setExpandedRuns(new Set([runId]));
      fetchRunSteps(runId);

      // Scroll after a short delay for rendering
      setTimeout(() => {
        const element = runRefs.current.get(runId);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
          hasScrolled.current = true;
        }
      }, 300);
    } else if (targetBatchId) {
      setExpandedSuites(new Set([targetBatchId]));
      setTimeout(() => {
        const element = suiteRefs.current.get(targetBatchId);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "start" });
          hasScrolled.current = true;
        }
      }, 300);
    }
  }, [loading, targetRunId, targetBatchId, testRuns]);

  async function fetchTestRuns() {
    try {
      const res = await fetch(
        `${API_URL}/api/test-runs/project/${projectId}`
      );
      if (res.ok) {
        const data = await res.json();
        setTestRuns(data);
      }
    } catch (error) {
      console.error("Failed to fetch test runs:", error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchTestCases() {
    try {
      const res = await fetch(
        `${API_URL}/api/test-cases/project/${projectId}`
      );
      if (res.ok) {
        const data = await res.json();
        setTestCases(data);
      }
    } catch (error) {
      console.error("Failed to fetch test cases:", error);
    }
  }

  async function fetchRunSteps(runId: number) {
    if (runSteps.has(runId)) return;

    setLoadingSteps((prev) => new Set(prev).add(runId));
    try {
      const res = await fetch(`${API_URL}/api/test-runs/${runId}/steps`);
      if (res.ok) {
        const data = await res.json();
        setRunSteps((prev) => new Map(prev).set(runId, data));
      }
    } catch (error) {
      console.error("Failed to fetch run steps:", error);
    } finally {
      setLoadingSteps((prev) => {
        const newSet = new Set(prev);
        newSet.delete(runId);
        return newSet;
      });
    }
  }

  async function handleClearAll() {
    setClearingAll(true);
    try {
      const res = await fetch(
        `${API_URL}/api/test-runs/project/${projectId}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        const data = await res.json();
        setTestRuns([]);
        setRunSteps(new Map());
        setExpandedRuns(new Set());
        setExpandedSuites(new Set());
        toast.success(`Cleared ${data.deleted} run(s)`);
      } else {
        toast.error("Failed to clear history");
      }
    } catch {
      toast.error("Failed to clear history");
    } finally {
      setClearingAll(false);
      setClearAllOpen(false);
    }
  }

  async function handleDeleteRun(runId: number) {
    try {
      const res = await fetch(`${API_URL}/api/test-runs/${runId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setTestRuns((prev) => prev.filter((r) => r.id !== runId));
        setRunSteps((prev) => {
          const newMap = new Map(prev);
          newMap.delete(runId);
          return newMap;
        });
        toast.success("Run deleted");
      } else {
        toast.error("Failed to delete run");
      }
    } catch {
      toast.error("Failed to delete run");
    } finally {
      setDeletingRunId(null);
    }
  }

  // Group test runs by batch_id
  const groupedTestRuns: GroupedRun[] = (() => {
    const suiteMap = new Map<string, TestRun[]>();
    const individualRuns: TestRun[] = [];

    testRuns.forEach((run) => {
      if (run.thread_id?.startsWith("batch-")) {
        const existing = suiteMap.get(run.thread_id) || [];
        existing.push(run);
        suiteMap.set(run.thread_id, existing);
      } else {
        individualRuns.push(run);
      }
    });

    const groups: GroupedRun[] = [];

    suiteMap.forEach((runs, batchId) => {
      const sortedRuns = [...runs].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      const label = runs.find((r) => r.batch_label)?.batch_label || undefined;
      groups.push({
        type: "suite",
        batchId,
        batchLabel: label,
        runs: sortedRuns,
        passCount: runs.filter((r) => r.status === "passed").length,
        failCount: runs.filter((r) => r.status === "failed").length,
        runningCount: runs.filter((r) => r.status === "running" || r.status === "pending").length,
        cancelledCount: runs.filter((r) => r.status === "cancelled").length,
        latestRun: sortedRuns[0],
      });
    });

    individualRuns.forEach((run) => {
      groups.push({
        type: "individual",
        runs: [run],
        passCount: run.status === "passed" ? 1 : 0,
        failCount: run.status === "failed" ? 1 : 0,
        runningCount: run.status === "running" || run.status === "pending" ? 1 : 0,
        cancelledCount: run.status === "cancelled" ? 1 : 0,
        latestRun: run,
      });
    });

    groups.sort(
      (a, b) =>
        new Date(b.latestRun.created_at).getTime() -
        new Date(a.latestRun.created_at).getTime()
    );

    return groups;
  })();

  function toggleSuiteExpanded(batchId: string) {
    setExpandedSuites((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(batchId)) {
        newSet.delete(batchId);
      } else {
        newSet.add(batchId);
      }
      return newSet;
    });
  }

  function toggleRunExpanded(runId: number) {
    setExpandedRuns((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(runId)) {
        newSet.delete(runId);
      } else {
        newSet.add(runId);
        fetchRunSteps(runId);
      }
      return newSet;
    });
  }

  const getTestCaseName = (testCaseId: number | null) => {
    if (!testCaseId) return null;
    const tc = testCases.find((t) => t.id === testCaseId);
    if (!tc) return `Test #${testCaseId}`;
    const prefix = projectPrefix && tc.test_case_number != null
      ? `${projectPrefix}-T${tc.test_case_number} — `
      : "";
    return `${prefix}${tc.name}`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
  };

  const formatDuration = (ms: number | null) => {
    if (!ms) return "-";
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const getStatusIcon = (status: string, size: "sm" | "md" = "md") => {
    const sizeClass = size === "sm" ? "h-4 w-4" : "h-5 w-5";
    switch (status) {
      case "passed":
        return <CheckCircle className={cn(sizeClass, "text-green-500")} />;
      case "failed":
        return <XCircle className={cn(sizeClass, "text-red-500")} />;
      case "running":
        return <Loader2 className={cn(sizeClass, "text-primary animate-spin")} />;
      default:
        return <Clock className={cn(sizeClass, "text-muted-foreground")} />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Link
              href={`/projects/${projectId}/test-cases`}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-lg font-semibold">Execution History</h1>
              <p className="text-xs text-muted-foreground">
                {testRuns.length} total runs
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {testRuns.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setClearAllOpen(true)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-1.5" />
                Clear All
              </Button>
            )}
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="px-6 py-4">
        {testRuns.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-border rounded-lg">
            <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h4 className="text-lg font-medium mb-2">No test runs yet</h4>
            <p className="text-muted-foreground">
              Run tests from the project page to see history here
            </p>
          </div>
        ) : (
          <div className="rounded-lg border border-border overflow-hidden">
            {/* Table header */}
            <div
              className="grid items-center px-4 py-2.5 bg-muted/50 border-b border-border text-xs font-medium text-muted-foreground"
              style={{ gridTemplateColumns: "1fr 110px 72px 72px 90px 92px 44px" }}
            >
              <span>Test Case</span>
              <span className="text-center">Status</span>
              <span className="text-center">Passed</span>
              <span className="text-center">Failed</span>
              <span className="text-center">Browser</span>
              <span className="text-right">Date</span>
              <span />
            </div>

            <AnimatePresence>
              {groupedTestRuns.map((group) => {
                if (group.type === "suite") {
                  const isExpanded = expandedSuites.has(group.batchId!);
                  const allPassed = group.runs.every((r) => r.status === "passed");
                  const anyFailed = group.runs.some((r) => r.status === "failed");
                  const suiteStatus = allPassed ? "passed" : anyFailed ? "failed" : group.runningCount > 0 ? "running" : "pending";

                  return (
                    <motion.div
                      key={group.batchId}
                      ref={(el) => { if (el) suiteRefs.current.set(group.batchId!, el); }}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className={cn(
                        "border-t border-border",
                        targetBatchId === group.batchId && "ring-1 ring-inset ring-primary/50"
                      )}
                    >
                      {/* Suite row */}
                      <div
                        onClick={() => toggleSuiteExpanded(group.batchId!)}
                        className="grid items-center px-4 py-2.5 cursor-pointer hover:bg-muted/30 transition-colors"
                        style={{ gridTemplateColumns: "1fr 110px 72px 72px 90px 92px 44px" }}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {isExpanded
                            ? <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            : <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
                          {allPassed
                            ? <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                            : anyFailed
                            ? <XCircle className="h-4 w-4 text-red-500 shrink-0" />
                            : <Clock className="h-4 w-4 text-muted-foreground shrink-0" />}
                          {group.batchLabel && group.batchLabel !== "All Scenarios"
                            ? <FolderOpen className="h-3.5 w-3.5 text-primary shrink-0" />
                            : <Layers className="h-3.5 w-3.5 text-primary shrink-0" />}
                          <span className="font-medium text-sm truncate">{group.batchLabel || "Suite"}</span>
                          <span className="text-xs text-muted-foreground shrink-0">
                            ({group.runs.length} {group.runs.length === 1 ? "test" : "tests"})
                          </span>
                        </div>
                        <div className="flex justify-center">
                          <span className={cn(
                            "text-xs px-2 py-0.5 rounded-full font-medium",
                            suiteStatus === "passed" ? "bg-green-500/10 text-green-500"
                            : suiteStatus === "failed" ? "bg-red-500/10 text-red-500"
                            : "bg-muted text-muted-foreground"
                          )}>
                            {suiteStatus}
                          </span>
                        </div>
                        <div className="flex justify-center">
                          <span className="text-sm font-medium text-green-500">{group.passCount}</span>
                        </div>
                        <div className="flex justify-center">
                          <span className="text-sm font-medium text-red-500">{group.failCount || "—"}</span>
                        </div>
                        {/* Browser — "Multiple" for cross-browser batches, single label otherwise */}
                        <div className="flex justify-center">
                          {(() => {
                            const distinct = [...new Set(group.runs.map(r => r.browser).filter(Boolean))] as string[];
                            if (distinct.length === 0) return null;
                            if (distinct.length > 1) {
                              return (
                                <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono whitespace-nowrap">
                                  Multiple
                                </span>
                              );
                            }
                            return (
                              <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono whitespace-nowrap">
                                {BROWSER_LABELS[distinct[0]] ?? distinct[0]}
                              </span>
                            );
                          })()}
                        </div>
                        <div className="flex justify-end">
                          <span className="text-xs text-muted-foreground">{formatRelativeDate(group.latestRun.created_at)}</span>
                        </div>
                        <div />
                      </div>

                      {/* Expanded suite runs */}
                      {isExpanded && group.runs.map((run) => (
                        <RunRow
                          key={run.id}
                          run={run}
                          testCaseName={getTestCaseName(run.test_case_id)}
                          isNested
                          isExpanded={expandedRuns.has(run.id)}
                          isHighlighted={targetRunId === String(run.id)}
                          steps={runSteps.get(run.id)}
                          isLoadingSteps={loadingSteps.has(run.id)}
                          onToggle={() => toggleRunExpanded(run.id)}
                          onDelete={() => setDeletingRunId(run.id)}
                          runRef={(el) => { if (el) runRefs.current.set(run.id, el); }}
                        />
                      ))}
                    </motion.div>
                  );
                }

                // Individual run
                const run = group.latestRun;
                return (
                  <RunRow
                    key={run.id}
                    run={run}
                    testCaseName={getTestCaseName(run.test_case_id)}
                    isNested={false}
                    isExpanded={expandedRuns.has(run.id)}
                    isHighlighted={targetRunId === String(run.id)}
                    steps={runSteps.get(run.id)}
                    isLoadingSteps={loadingSteps.has(run.id)}
                    onToggle={() => toggleRunExpanded(run.id)}
                    onDelete={() => setDeletingRunId(run.id)}
                    runRef={(el) => { if (el) runRefs.current.set(run.id, el); }}
                  />
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </main>

      {/* Clear All Confirmation */}
      <ConfirmDialog
        open={clearAllOpen}
        onOpenChange={setClearAllOpen}
        title="Clear All History"
        description={`This will permanently delete all ${testRuns.length} test run(s) and their step data. This cannot be undone.`}
        confirmLabel="Clear All"
        variant="destructive"
        onConfirm={handleClearAll}
        loading={clearingAll}
        requireText="delete"
      />

      {/* Single Run Delete Confirmation */}
      <ConfirmDialog
        open={deletingRunId !== null}
        onOpenChange={(open) => { if (!open) setDeletingRunId(null); }}
        title="Delete Run"
        description="This will permanently delete this test run and its step data. This cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => { if (deletingRunId) handleDeleteRun(deletingRunId); }}
      />
    </div>
  );
}

const COL_TEMPLATE = "1fr 110px 72px 72px 90px 92px 44px";

interface RunRowProps {
  run: TestRun;
  testCaseName: string | null;
  isNested: boolean;
  isExpanded: boolean;
  isHighlighted: boolean;
  steps?: RunStep[];
  isLoadingSteps: boolean;
  onToggle: () => void;
  onDelete: () => void;
  runRef: (el: HTMLDivElement | null) => void;
}

function RunRow({
  run,
  testCaseName,
  isNested,
  isExpanded,
  isHighlighted,
  steps,
  isLoadingSteps,
  onToggle,
  onDelete,
  runRef,
}: RunRowProps) {
  const formatDuration = (ms: number | null) => {
    if (!ms) return "-";
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case "passed": return <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />;
      case "failed": return <XCircle className="h-4 w-4 text-red-500 shrink-0" />;
      case "running": return <Loader2 className="h-4 w-4 text-primary animate-spin shrink-0" />;
      default: return <Clock className="h-4 w-4 text-muted-foreground shrink-0" />;
    }
  };

  return (
    <div
      ref={runRef}
      className={cn(
        "border-t border-border",
        isNested && "bg-muted/20",
        isHighlighted && "ring-1 ring-inset ring-primary/50",
      )}
    >
      {/* Row */}
      <div
        onClick={onToggle}
        className="grid items-center px-4 py-2.5 cursor-pointer hover:bg-muted/30 transition-colors"
        style={{ gridTemplateColumns: COL_TEMPLATE }}
      >
        {/* Name */}
        <div className={cn("flex items-center gap-2 min-w-0", isNested && "pl-6")}>
          {isExpanded
            ? <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            : <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
          {statusIcon(run.status)}
          <span className="text-sm truncate">{testCaseName || run.summary || `Run #${run.id}`}</span>
        </div>

        {/* Status */}
        <div className="flex justify-center">
          <span className={cn(
            "text-xs px-2 py-0.5 rounded-full font-medium",
            run.status === "passed" ? "bg-green-500/10 text-green-500"
            : run.status === "failed" ? "bg-red-500/10 text-red-500"
            : "bg-muted text-muted-foreground"
          )}>
            {run.status}
          </span>
        </div>

        {/* Passed */}
        <div className="flex justify-center">
          <span className="text-sm font-medium text-green-500">{run.pass_count}</span>
        </div>

        {/* Failed */}
        <div className="flex justify-center">
          <span className="text-sm font-medium text-red-500">{run.error_count || "—"}</span>
        </div>

        {/* Browser */}
        <div className="flex justify-center">
          {run.browser && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono whitespace-nowrap">
              {BROWSER_LABELS[run.browser] ?? run.browser}
            </span>
          )}
        </div>

        {/* Date */}
        <div className="flex justify-end">
          <span className="text-xs text-muted-foreground">{formatRelativeDate(run.created_at)}</span>
        </div>

        {/* Delete */}
        <div className="flex justify-center">
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
            title="Delete run"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Expanded step details */}
      {isExpanded && (
        <div className="border-t border-border bg-muted/30 px-4 py-3 space-y-2">
          {isLoadingSteps ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : steps && steps.length > 0 ? (
            steps.map((step) => (
              <div
                key={step.id}
                className={cn(
                  "flex items-start gap-3 p-3 rounded-lg",
                  step.status === "failed" ? "bg-red-500/5"
                  : step.fixture_name ? "bg-blue-500/5 border-l-2 border-blue-500"
                  : "bg-background"
                )}
              >
                <div className="pt-0.5">{statusIcon(step.status)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">
                      {ACTION_LABELS[step.action] || step.action}
                    </span>
                    {step.fixture_name && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-500">
                        {step.fixture_name}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">{formatDuration(step.duration)}</span>
                  </div>
                  {(step.target || step.value) && (
                    <div className="mt-1 text-sm text-muted-foreground font-mono truncate">
                      {step.target && <span>target: {step.target}</span>}
                      {step.target && step.value && <span> | </span>}
                      {step.value && <span>value: {step.value}</span>}
                    </div>
                  )}
                  {step.error && step.status === "failed" && (
                    <div className="mt-2 text-sm text-red-500 bg-red-500/10 p-2 rounded">
                      {step.error}
                    </div>
                  )}
                  {step.screenshot && (
                    <div className="mt-3">
                      <p className="text-xs text-muted-foreground mb-1">
                        {step.action === "screenshot" ? "Captured screenshot:" : "Screenshot at failure:"}
                      </p>
                      <img
                        src={`data:image/png;base64,${step.screenshot}`}
                        alt={step.action === "screenshot" ? "Captured screenshot" : "Screenshot at failure"}
                        className="rounded border border-border max-w-full h-auto max-h-64 cursor-pointer hover:opacity-90"
                        onClick={() => window.open(`data:image/png;base64,${step.screenshot}`, "_blank")}
                      />
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">No step details available</p>
          )}
          {run.summary && (
            <p className="text-sm text-muted-foreground pt-1">{run.summary}</p>
          )}
        </div>
      )}
    </div>
  );
}
