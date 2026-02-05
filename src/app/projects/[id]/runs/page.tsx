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
  Layers,
  Loader2,
} from "lucide-react";
import { ThemeToggle } from "@/components/dashboard/ThemeToggle";
import { cn } from "@/lib/utils";
import { API_URL } from "@/lib/api";

interface TestCase {
  id: number;
  name: string;
  natural_query: string;
  priority: string;
  tags: string[] | string;
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
  status: string;
  started_at: string | null;
  completed_at: string | null;
  summary: string | null;
  error_count: number;
  pass_count: number;
  created_at: string;
}

interface TestRunWithSteps extends TestRun {
  steps: RunStep[];
}

interface GroupedRun {
  type: "suite" | "individual";
  batchId?: string;
  runs: TestRun[];
  passCount: number;
  errorCount: number;
  latestRun: TestRun;
}

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

export default function ProjectRunsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const projectId = params.id as string;
  const targetRunId = searchParams.get("runId");
  const targetBatchId = searchParams.get("batchId");

  const [testRuns, setTestRuns] = useState<TestRun[]>([]);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRuns, setExpandedRuns] = useState<Set<number>>(new Set());
  const [expandedSuites, setExpandedSuites] = useState<Set<string>>(new Set());
  const [runSteps, setRunSteps] = useState<Map<number, RunStep[]>>(new Map());
  const [loadingSteps, setLoadingSteps] = useState<Set<number>>(new Set());

  const hasScrolled = useRef(false);
  const runRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const suiteRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  useEffect(() => {
    fetchTestRuns();
    fetchTestCases();
  }, [projectId]);

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
      groups.push({
        type: "suite",
        batchId,
        runs: sortedRuns,
        passCount: runs.filter((r) => r.status === "passed").length,
        errorCount: runs.filter((r) => r.status === "failed").length,
        latestRun: sortedRuns[0],
      });
    });

    individualRuns.forEach((run) => {
      groups.push({
        type: "individual",
        runs: [run],
        passCount: run.status === "passed" ? 1 : 0,
        errorCount: run.status === "failed" ? 1 : 0,
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
    const isExpanding = !expandedRuns.has(runId);
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
    return tc?.name || `Test #${testCaseId}`;
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
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href={`/projects/${projectId}`}
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
          <ThemeToggle />
        </div>
      </header>

      <main className="container mx-auto max-w-4xl px-6 py-8">
        {testRuns.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-border rounded-lg">
            <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h4 className="text-lg font-medium mb-2">No test runs yet</h4>
            <p className="text-muted-foreground">
              Run tests from the project page to see history here
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence>
              {groupedTestRuns.map((group) => {
                if (group.type === "suite") {
                  const isExpanded = expandedSuites.has(group.batchId!);
                  const allPassed = group.runs.every((r) => r.status === "passed");
                  const anyFailed = group.runs.some((r) => r.status === "failed");

                  return (
                    <motion.div
                      key={group.batchId}
                      ref={(el) => {
                        if (el) suiteRefs.current.set(group.batchId!, el);
                      }}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        "rounded-lg border bg-card overflow-hidden",
                        targetBatchId === group.batchId
                          ? "border-primary ring-2 ring-primary/20"
                          : "border-border"
                      )}
                    >
                      {/* Suite Header */}
                      <div
                        onClick={() => toggleSuiteExpanded(group.batchId!)}
                        className="p-4 flex items-center justify-between cursor-pointer hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          {allPassed ? (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          ) : anyFailed ? (
                            <XCircle className="h-5 w-5 text-red-500" />
                          ) : (
                            <Clock className="h-5 w-5 text-muted-foreground" />
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              <Layers className="h-4 w-4 text-primary" />
                              <p className="font-medium">
                                Suite Run ({group.runs.length} tests)
                              </p>
                              <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary">
                                Suite
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {formatDate(group.latestRun.created_at)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-sm text-green-500">
                            {group.passCount} passed
                          </span>
                          {group.errorCount > 0 && (
                            <span className="text-sm text-red-500">
                              {group.errorCount} failed
                            </span>
                          )}
                          {isExpanded ? (
                            <ChevronDown className="h-5 w-5 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                      </div>

                      {/* Expanded Suite Runs */}
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="border-t border-border"
                        >
                          <div className="p-2 space-y-2">
                            {group.runs.map((run) => (
                              <RunCard
                                key={run.id}
                                run={run}
                                testCaseName={getTestCaseName(run.test_case_id)}
                                isExpanded={expandedRuns.has(run.id)}
                                isHighlighted={targetRunId === String(run.id)}
                                steps={runSteps.get(run.id)}
                                isLoadingSteps={loadingSteps.has(run.id)}
                                onToggle={() => toggleRunExpanded(run.id)}
                                runRef={(el) => {
                                  if (el) runRefs.current.set(run.id, el);
                                }}
                              />
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </motion.div>
                  );
                }

                // Individual run
                const run = group.latestRun;
                return (
                  <RunCard
                    key={run.id}
                    run={run}
                    testCaseName={getTestCaseName(run.test_case_id)}
                    isExpanded={expandedRuns.has(run.id)}
                    isHighlighted={targetRunId === String(run.id)}
                    steps={runSteps.get(run.id)}
                    isLoadingSteps={loadingSteps.has(run.id)}
                    onToggle={() => toggleRunExpanded(run.id)}
                    runRef={(el) => {
                      if (el) runRefs.current.set(run.id, el);
                    }}
                  />
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </main>
    </div>
  );
}

// Separate component for run card to keep code cleaner
interface RunCardProps {
  run: TestRun;
  testCaseName: string | null;
  isExpanded: boolean;
  isHighlighted: boolean;
  steps?: RunStep[];
  isLoadingSteps: boolean;
  onToggle: () => void;
  runRef: (el: HTMLDivElement | null) => void;
}

function RunCard({
  run,
  testCaseName,
  isExpanded,
  isHighlighted,
  steps,
  isLoadingSteps,
  onToggle,
  runRef,
}: RunCardProps) {
  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleString();
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

  return (
    <motion.div
      ref={runRef}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "rounded-lg border bg-card overflow-hidden",
        isHighlighted ? "border-primary ring-2 ring-primary/20" : "border-border"
      )}
    >
      {/* Run Header */}
      <div
        onClick={onToggle}
        className="p-4 flex items-center justify-between cursor-pointer hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-4">
          {getStatusIcon(run.status)}
          <div>
            <div className="flex items-center gap-2">
              <p className="font-medium">
                {testCaseName || run.summary || `Run #${run.id}`}
              </p>
              <span
                className={cn(
                  "text-xs px-2 py-0.5 rounded-full",
                  run.status === "passed"
                    ? "bg-green-500/10 text-green-500"
                    : run.status === "failed"
                    ? "bg-red-500/10 text-red-500"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {run.status}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              {formatDate(run.created_at)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right text-sm">
            <span className="text-green-500">{run.pass_count} passed</span>
            {run.error_count > 0 && (
              <span className="text-red-500 ml-2">{run.error_count} failed</span>
            )}
          </div>
          {isExpanded ? (
            <ChevronDown className="h-5 w-5 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
      </div>

      {/* Run Steps */}
      {isExpanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="border-t border-border bg-muted/30"
        >
          <div className="p-4 space-y-2">
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
                    step.status === "failed" ? "bg-red-500/5" :
                    step.fixture_name ? "bg-blue-500/5 border-l-2 border-blue-500" : "bg-background"
                  )}
                >
                  <div className="pt-0.5">{getStatusIcon(step.status, "sm")}</div>
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
                      <span className="text-xs text-muted-foreground">
                        {formatDuration(step.duration)}
                      </span>
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
                          onClick={() => {
                            const win = window.open();
                            if (win) {
                              win.document.write(`<img src="data:image/png;base64,${step.screenshot}" style="max-width:100%"/>`);
                            }
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No step details available
              </p>
            )}
          </div>
          {run.summary && (
            <div className="px-4 pb-4">
              <p className="text-sm text-muted-foreground">{run.summary}</p>
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}
