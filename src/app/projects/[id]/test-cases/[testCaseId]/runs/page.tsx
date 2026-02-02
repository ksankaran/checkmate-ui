"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Play,
  CheckCircle,
  XCircle,
  Clock,
  ChevronDown,
  ChevronRight,
  Loader2,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { ThemeToggle } from "@/components/dashboard/ThemeToggle";
import { cn } from "@/lib/utils";
import { API_URL, getFeatures, Features } from "@/lib/api";

interface TestStep {
  action: string;
  target: string | null;
  value: string | null;
  description: string;
}

interface TestCase {
  id: number;
  name: string;
  natural_query: string;
  priority: string;
  tags: string[] | string;
  steps: string | TestStep[];
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
  attempt?: number;
  max_attempts?: number;
}

interface TestRun {
  id: number;
  test_case_id: number;
  project_id: number;
  trigger: string;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  summary: string | null;
  error_count: number;
  pass_count: number;
  created_at: string;
  steps: RunStep[];
  // Retry tracking
  retry_attempt: number;
  max_retries: number;
  original_run_id: number | null;
  retry_mode: string | null;
  retry_reason: string | null;
}

// Grouped run with its retries
interface RunGroup {
  original: TestRun;
  retries: TestRun[];
  isExpanded: boolean;
}

// Group runs by original_run_id
function groupRuns(runs: TestRun[]): RunGroup[] {
  const groups: Map<number, RunGroup> = new Map();
  const retryRuns: TestRun[] = [];

  // First pass: identify original runs and retries
  for (const run of runs) {
    if (run.original_run_id === null) {
      // This is an original run
      groups.set(run.id, { original: run, retries: [], isExpanded: false });
    } else {
      // This is a retry
      retryRuns.push(run);
    }
  }

  // Second pass: attach retries to their original runs
  for (const retry of retryRuns) {
    const group = groups.get(retry.original_run_id!);
    if (group) {
      group.retries.push(retry);
    } else {
      // Orphan retry (original run not in list) - treat as standalone
      groups.set(retry.id, { original: retry, retries: [], isExpanded: false });
    }
  }

  // Sort retries within each group by retry_attempt
  for (const group of groups.values()) {
    group.retries.sort((a, b) => a.retry_attempt - b.retry_attempt);
  }

  // Return groups sorted by original run's created_at (newest first)
  return Array.from(groups.values()).sort(
    (a, b) => new Date(b.original.created_at).getTime() - new Date(a.original.created_at).getTime()
  );
}

interface Browser {
  id: string;
  name: string;
  headless: boolean;
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
  back: "Go Back",
  evaluate: "Evaluate JS",
  upload: "Upload",
  drag: "Drag & Drop",
};

export default function TestCaseRunsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const projectId = params.id as string;
  const testCaseId = params.testCaseId as string;
  const autorun = searchParams.get("autorun") === "true";
  const browserFromUrl = searchParams.get("browser");
  const retryFromUrl = searchParams.get("retry") === "true";
  const maxRetriesFromUrl = parseInt(searchParams.get("maxRetries") || "2");
  const retryModeFromUrl = (searchParams.get("retryMode") as "simple" | "intelligent") || "simple";
  const runIdFromUrl = searchParams.get("runId");
  const hasAutoRun = useRef(false);
  const hasScrolledToRun = useRef(false);

  const [testCase, setTestCase] = useState<TestCase | null>(null);
  const [runs, setRuns] = useState<TestRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [expandedRuns, setExpandedRuns] = useState<Set<number>>(new Set());
  // For step-by-step animation
  const [animatingRunId, setAnimatingRunId] = useState<number | null>(null);
  const [visibleStepIndex, setVisibleStepIndex] = useState<number>(-1);
  // Browser selection
  const [browsers, setBrowsers] = useState<Browser[]>([]);
  const [selectedBrowser, setSelectedBrowser] = useState<string | null>(null);

  // Retry configuration (initialize from URL params if present)
  const [features, setFeatures] = useState<Features>({ intelligent_retry: false });
  const [retryEnabled, setRetryEnabled] = useState(retryFromUrl);
  const [maxRetries, setMaxRetries] = useState(maxRetriesFromUrl);
  const [retryMode, setRetryMode] = useState<"simple" | "intelligent">(retryModeFromUrl);

  // Retry status tracking
  const [retryStatus, setRetryStatus] = useState<string | null>(null);

  // Track which run groups have their retries expanded
  const [expandedRetryGroups, setExpandedRetryGroups] = useState<Set<number>>(new Set());

  // Compute grouped runs
  const runGroups = groupRuns(runs);

  useEffect(() => {
    fetchTestCase();
    fetchRuns();
    fetchBrowsers();
    fetchFeatures();
  }, [testCaseId]);

  async function fetchFeatures() {
    const f = await getFeatures();
    setFeatures(f);
    // Default to intelligent mode if available
    if (f.intelligent_retry) {
      setRetryMode("intelligent");
    }
  }

  // Auto-run when navigating with ?autorun=true
  useEffect(() => {
    if (autorun && !loading && testCase && !hasAutoRun.current && !isRunning) {
      hasAutoRun.current = true;
      // Clear URL params to prevent re-run on refresh
      router.replace(`/projects/${projectId}/test-cases/${testCaseId}/runs`, { scroll: false });
      handleRunTest();
    }
  }, [autorun, loading, testCase]);

  async function fetchTestCase() {
    try {
      const res = await fetch(`${API_URL}/api/test-cases/${testCaseId}`);
      if (res.ok) {
        const data = await res.json();
        setTestCase(data);
      }
    } catch (error) {
      console.error("Failed to fetch test case:", error);
    }
  }

  async function fetchRuns() {
    try {
      const res = await fetch(`${API_URL}/api/test-cases/${testCaseId}/runs`);
      if (res.ok) {
        const data = await res.json();
        setRuns(data);
        // Expand specified run from URL, or latest run
        const targetRunId = runIdFromUrl ? parseInt(runIdFromUrl) : (data.length > 0 ? data[0].id : null);
        if (targetRunId) {
          setExpandedRuns(new Set([targetRunId]));
          // Also expand the retry group if this run is part of one
          const targetRun = data.find((r: TestRun) => r.id === targetRunId);
          if (targetRun?.original_run_id) {
            setExpandedRetryGroups(new Set([targetRun.original_run_id]));
          }
        }
      }
    } catch (error) {
      console.error("Failed to fetch runs:", error);
    } finally {
      setLoading(false);
    }
  }

  // Scroll to specified run after loading
  useEffect(() => {
    if (!loading && runIdFromUrl && !hasScrolledToRun.current) {
      hasScrolledToRun.current = true;
      // Small delay to let the DOM render
      setTimeout(() => {
        const runElement = document.getElementById(`run-${runIdFromUrl}`);
        if (runElement) {
          runElement.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 100);
    }
  }, [loading, runIdFromUrl]);

  async function fetchBrowsers() {
    try {
      const res = await fetch(`${API_URL}/api/test-runs/browsers`);
      if (res.ok) {
        const data = await res.json();
        setBrowsers(data.browsers || []);
        // Set browser from URL param, or fall back to default
        if (!selectedBrowser) {
          if (browserFromUrl && data.browsers?.some((b: Browser) => b.id === browserFromUrl)) {
            setSelectedBrowser(browserFromUrl);
          } else if (data.default) {
            setSelectedBrowser(data.default);
          }
        }
      }
    } catch (error) {
      console.error("Failed to fetch browsers:", error);
    }
  }

  async function handleRunTest() {
    setIsRunning(true);
    setVisibleStepIndex(-1);
    setRetryStatus(null);

    // Track steps as they complete for building the run object
    const completedSteps: RunStep[] = [];
    let runId: number | null = null;
    let totalSteps = 0;

    // Build request body with retry config
    const requestBody: {
      browser?: string | null;
      retry?: { max_retries: number; retry_mode: string };
    } = { browser: selectedBrowser };

    if (retryEnabled && maxRetries > 0) {
      requestBody.retry = {
        max_retries: maxRetries,
        retry_mode: retryMode,
      };
    }

    try {
      const response = await fetch(
        `${API_URL}/api/test-cases/${testCaseId}/runs/stream`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        }
      );

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("No response body");
      }

      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process complete SSE messages (ending with \n\n)
        while (buffer.includes("\n\n")) {
          const messageEnd = buffer.indexOf("\n\n");
          const message = buffer.slice(0, messageEnd);
          buffer = buffer.slice(messageEnd + 2);

          for (const line of message.split("\n")) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));

              switch (data.type) {
                case "run_started":
                  runId = data.run_id;
                  totalSteps = data.total_steps || 0;
                  // Create placeholder run in running state
                  const placeholderRun: TestRun = {
                    id: data.run_id,
                    test_case_id: parseInt(testCaseId),
                    project_id: parseInt(projectId),
                    trigger: "manual",
                    status: "running",
                    started_at: new Date().toISOString(),
                    completed_at: null,
                    summary: null,
                    error_count: 0,
                    pass_count: 0,
                    created_at: new Date().toISOString(),
                    steps: [],
                    // Retry tracking
                    retry_attempt: data.retry_attempt || 0,
                    max_retries: data.max_retries || 0,
                    original_run_id: data.original_run_id || null,
                    retry_mode: null,
                    retry_reason: null,
                  };
                  setRuns((prev) => [placeholderRun, ...prev]);
                  setExpandedRuns(new Set([data.run_id]));
                  setAnimatingRunId(data.run_id);
                  // Auto-expand retry group when new retry run starts
                  if (data.original_run_id) {
                    setExpandedRetryGroups((prev) => new Set([...prev, data.original_run_id]));
                  }
                  break;

                case "step_started":
                  setVisibleStepIndex(data.step_number - 1);
                  // Add or update placeholder step (handles retries)
                  const placeholderStep: RunStep = {
                    id: data.step_number,
                    step_number: data.step_number,
                    action: data.action,
                    target: data.target || null,
                    value: data.value || null,
                    status: "running",
                    duration: null,
                    error: null,
                    screenshot: null,
                    fixture_name: data.fixture_name || null,
                    attempt: data.attempt,
                    max_attempts: data.max_attempts,
                  };
                  setRuns((prev) => {
                    const updated = [...prev];
                    if (updated[0] && updated[0].id === runId) {
                      const steps = [...updated[0].steps];
                      const existingIdx = steps.findIndex(s => s.step_number === data.step_number);
                      if (existingIdx >= 0) {
                        // Update existing step (retry case)
                        steps[existingIdx] = placeholderStep;
                      } else {
                        // Add new step
                        steps.push(placeholderStep);
                      }
                      updated[0] = { ...updated[0], steps };
                    }
                    return updated;
                  });
                  break;

                case "step_completed":
                  const completedStep: RunStep = {
                    id: data.step_number,
                    step_number: data.step_number,
                    action: data.action,
                    target: data.target || null,
                    value: data.value || null,
                    status: data.status,
                    duration: data.duration,
                    error: data.error,
                    screenshot: data.screenshot || null,
                    fixture_name: data.fixture_name || null,
                    attempt: data.attempt,
                    max_attempts: data.max_attempts,
                  };
                  completedSteps.push(completedStep);
                  // Update the step status
                  setRuns((prev) => {
                    const updated = [...prev];
                    if (updated[0] && updated[0].id === runId) {
                      const steps = [...updated[0].steps];
                      steps[data.step_number - 1] = completedStep;
                      updated[0] = { ...updated[0], steps };
                    }
                    return updated;
                  });
                  break;

                case "run_completed":
                  // Update with final run state - find by ID since retries may have added new runs
                  setRuns((prev) => {
                    return prev.map((run) => {
                      if (run.id === data.run_id) {
                        return {
                          ...run,
                          status: data.status,
                          pass_count: data.pass_count,
                          error_count: data.error_count,
                          summary: data.summary,
                          completed_at: new Date().toISOString(),
                        };
                      }
                      return run;
                    });
                  });
                  // Only clear animation if this is the final run (no more retries)
                  if (data.status === "passed" || data.retry_attempt >= data.max_retries) {
                    setAnimatingRunId(null);
                    setVisibleStepIndex(-1);
                    setRetryStatus(null);
                  }
                  break;

                case "step_retry":
                  // Step is being retried - update status
                  setRetryStatus(`Retrying step ${data.step_number} (attempt ${data.attempt}/${data.max_attempts}): ${data.error}`);
                  break;

                case "test_retry":
                  // Test is being retried - show status
                  setRetryStatus(`Retrying test (attempt ${data.attempt}/${data.max_attempts}): ${data.reason}`);
                  // Reset for new run
                  setVisibleStepIndex(-1);
                  break;

                case "retry_skipped":
                  // Intelligent retry decided not to retry
                  setRetryStatus(`Retry skipped: ${data.reason}${data.details ? ` - ${data.details}` : ""}`);
                  setAnimatingRunId(null);
                  break;

                case "error":
                  console.error("SSE error:", data.message);
                  setAnimatingRunId(null);
                  setRetryStatus(null);
                  break;
              }
            } catch (parseError) {
              console.error("SSE parse error:", parseError);
            }
          }
        }
      }
      }
    } catch (error) {
      console.error("Failed to run test:", error);
      setAnimatingRunId(null);
      setRetryStatus(null);
    } finally {
      setIsRunning(false);
      setVisibleStepIndex(-1);
    }
  }

  const toggleRunExpanded = (runId: number) => {
    const newExpanded = new Set(expandedRuns);
    if (newExpanded.has(runId)) {
      newExpanded.delete(runId);
    } else {
      newExpanded.add(runId);
    }
    setExpandedRuns(newExpanded);
  };

  const toggleRetryGroupExpanded = (originalRunId: number) => {
    const newExpanded = new Set(expandedRetryGroups);
    if (newExpanded.has(originalRunId)) {
      newExpanded.delete(originalRunId);
    } else {
      newExpanded.add(originalRunId);
    }
    setExpandedRetryGroups(newExpanded);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case "critical":
        return "text-purple-500 bg-purple-500/10";
      case "high":
        return "text-red-500 bg-red-500/10";
      case "medium":
        return "text-yellow-500 bg-yellow-500/10";
      case "low":
        return "text-green-500 bg-green-500/10";
      default:
        return "text-muted-foreground bg-muted";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "passed":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "failed":
        return <XCircle className="h-5 w-5 text-red-500" />;
      case "running":
        return <Loader2 className="h-5 w-5 text-primary animate-spin" />;
      default:
        return <Clock className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStepStatusIcon = (status: string) => {
    switch (status) {
      case "passed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "running":
        return <Loader2 className="h-4 w-4 text-primary animate-spin" />;
      case "skipped":
        return <Clock className="h-4 w-4 text-muted-foreground" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const parseTags = (): string[] => {
    if (!testCase?.tags) return [];
    if (Array.isArray(testCase.tags)) return testCase.tags;
    try {
      return JSON.parse(testCase.tags);
    } catch {
      return [];
    }
  };

  const formatDuration = (ms: number | null) => {
    if (!ms) return "-";
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  // Get display status for a step during animation
  const getStepDisplayStatus = (runId: number, stepIndex: number, actualStatus: string) => {
    if (runId !== animatingRunId) return actualStatus;
    if (stepIndex < visibleStepIndex) return actualStatus; // completed steps
    if (stepIndex === visibleStepIndex) return "running"; // current step
    return "pending"; // future steps
  };

  // Check if step should be visible during animation
  const isStepVisible = (runId: number, stepIndex: number) => {
    if (runId !== animatingRunId) return true;
    return stepIndex <= visibleStepIndex;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const tags = parseTags();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href={`/projects/${projectId}/test-cases/${testCaseId}`}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-lg font-semibold">Run History</h1>
              <p className="text-xs text-muted-foreground">
                {testCase?.name}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Retry toggle */}
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={retryEnabled}
                  onChange={(e) => setRetryEnabled(e.target.checked)}
                  disabled={isRunning}
                  className="rounded border-border"
                />
                <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">Retry</span>
              </label>
            </div>

            {/* Retry options (shown when retry is enabled) */}
            {retryEnabled && (
              <>
                <div className="relative">
                  <select
                    value={maxRetries}
                    onChange={(e) => setMaxRetries(parseInt(e.target.value))}
                    disabled={isRunning}
                    className="appearance-none px-2 py-2 pr-6 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
                    title="Max retries"
                  >
                    <option value={1}>1x</option>
                    <option value={2}>2x</option>
                    <option value={3}>3x</option>
                  </select>
                  <ChevronDown className="absolute right-1 top-1/2 -translate-y-1/2 h-3 w-3 pointer-events-none text-muted-foreground" />
                </div>

                {/* Retry mode (only show if intelligent retry is enabled) */}
                {features.intelligent_retry && (
                  <div className="relative">
                    <select
                      value={retryMode}
                      onChange={(e) => setRetryMode(e.target.value as "simple" | "intelligent")}
                      disabled={isRunning}
                      className="appearance-none px-2 py-2 pr-6 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
                      title="Retry mode"
                    >
                      <option value="simple">Simple</option>
                      <option value="intelligent">Smart</option>
                    </select>
                    <ChevronDown className="absolute right-1 top-1/2 -translate-y-1/2 h-3 w-3 pointer-events-none text-muted-foreground" />
                  </div>
                )}
              </>
            )}

            <div className="w-px h-6 bg-border" />

            {/* Browser selector */}
            {browsers.length > 0 && (
              <div className="relative">
                <select
                  value={selectedBrowser || ""}
                  onChange={(e) => setSelectedBrowser(e.target.value)}
                  disabled={isRunning}
                  className="appearance-none px-3 py-2 pr-8 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
                >
                  {browsers.map((browser) => (
                    <option key={browser.id} value={browser.id}>
                      {browser.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none text-muted-foreground" />
              </div>
            )}
            <button
              onClick={handleRunTest}
              disabled={isRunning}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {isRunning ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              {isRunning ? "Running..." : "Run Test"}
            </button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-4xl px-6 py-8">
        {/* Retry Status Banner */}
        <AnimatePresence>
          {retryStatus && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center gap-2"
            >
              <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
              <span className="text-sm text-amber-700 dark:text-amber-400">
                {retryStatus}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Test Case Info */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg border border-border bg-card p-6 mb-6"
        >
          <h2 className="text-xl font-bold mb-2">{testCase?.name}</h2>
          <p className="text-muted-foreground mb-4">{testCase?.natural_query}</p>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`text-xs px-2 py-1 rounded-full ${getPriorityColor(
                testCase?.priority || ""
              )}`}
            >
              {testCase?.priority}
            </span>
            {tags.map((tag) => (
              <span
                key={tag}
                className="text-xs px-2 py-1 rounded bg-muted text-muted-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
        </motion.div>

        {/* Run History */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">
            Run History ({runs.length})
          </h3>

          {runs.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-border rounded-lg">
              <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h4 className="text-lg font-medium mb-2">No runs yet</h4>
              <p className="text-muted-foreground mb-4">
                Click "Run Test" to execute this test case
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence>
                {runGroups.map((group, groupIndex) => {
                  const hasRetries = group.retries.length > 0;
                  const latestRun = hasRetries ? group.retries[group.retries.length - 1] : group.original;
                  const isRetryGroupExpanded = expandedRetryGroups.has(group.original.id);

                  // Helper to render a single run
                  const renderRun = (run: TestRun, isNested: boolean = false) => (
                    <motion.div
                      key={run.id}
                      id={`run-${run.id}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        "rounded-lg border border-border bg-card overflow-hidden",
                        isNested && "ml-6 border-l-2 border-l-amber-500/50"
                      )}
                    >
                      {/* Run Header */}
                      <button
                        onClick={() => toggleRunExpanded(run.id)}
                        className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          {getStatusIcon(run.status)}
                          <div className="text-left">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                {isNested ? `Retry #${run.retry_attempt}` : `Run #${run.id}`}
                              </span>
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
                              {run.retry_attempt > 0 && !isNested && (
                                <span className="text-xs px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                  attempt {run.retry_attempt + 1}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {formatDate(run.created_at)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right text-sm">
                            {run.id === animatingRunId ? (
                              <span className="text-muted-foreground">
                                {Math.max(0, visibleStepIndex + 1)} / {run.steps.length} steps
                              </span>
                            ) : (
                              <>
                                <span className="text-green-500">{run.pass_count} passed</span>
                                {run.error_count > 0 && (
                                  <span className="text-red-500 ml-2">
                                    {run.error_count} failed
                                  </span>
                                )}
                              </>
                            )}
                          </div>
                          {expandedRuns.has(run.id) ? (
                            <ChevronDown className="h-5 w-5 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                      </button>

                      {/* Run Steps */}
                      {expandedRuns.has(run.id) && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="border-t border-border bg-muted/30"
                        >
                          <div className="p-4 space-y-2">
                            {run.steps.map((step, stepIndex) => {
                              const displayStatus = getStepDisplayStatus(run.id, stepIndex, step.status);
                              const visible = isStepVisible(run.id, stepIndex);

                              return (
                                <motion.div
                                  key={step.id}
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{
                                    opacity: visible ? 1 : 0.3,
                                    x: visible ? 0 : -10
                                  }}
                                  transition={{ duration: 0.2 }}
                                  className={cn(
                                    "flex items-start gap-3 p-3 rounded-lg",
                                    displayStatus === "failed"
                                      ? "bg-red-500/5"
                                      : displayStatus === "running"
                                      ? "bg-primary/5 border border-primary/20"
                                      : step.fixture_name
                                      ? "bg-blue-500/5 border-l-2 border-blue-500"
                                      : "bg-background"
                                  )}
                                >
                                  <div className="pt-0.5">
                                    {getStepStatusIcon(displayStatus)}
                                  </div>
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
                                      {displayStatus !== "pending" && displayStatus !== "running" && (
                                        <span className="text-xs text-muted-foreground">
                                          {formatDuration(step.duration)}
                                        </span>
                                      )}
                                      {displayStatus === "running" && (
                                        <span className="text-xs text-primary animate-pulse">
                                          {step.attempt && step.attempt > 1
                                            ? `retry ${step.attempt - 1}...`
                                            : "executing..."}
                                        </span>
                                      )}
                                      {step.attempt && step.attempt > 1 && displayStatus !== "running" && (
                                        <span className="text-xs px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                          {step.attempt - 1} {step.attempt === 2 ? "retry" : "retries"}
                                        </span>
                                      )}
                                    </div>
                                    {(step.target || step.value) && (
                                      <div className="mt-1 text-sm text-muted-foreground font-mono">
                                        {step.target && <span>target: {step.target}</span>}
                                        {step.target && step.value && <span> | </span>}
                                        {step.value && <span>value: {step.value}</span>}
                                      </div>
                                    )}
                                    {step.error && displayStatus === "failed" && (
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
                                          className="rounded border border-border max-w-full h-auto max-h-64 cursor-pointer hover:opacity-90 transition-opacity"
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
                                </motion.div>
                              );
                            })}
                          </div>
                          {run.summary && (
                            <div className="px-4 pb-4">
                              <p className="text-sm text-muted-foreground">
                                {run.summary}
                              </p>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </motion.div>
                  );

                  return (
                    <motion.div
                      key={group.original.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: groupIndex * 0.05 }}
                      className="space-y-2"
                    >
                      {/* Main run card */}
                      <div className="relative">
                        {renderRun(group.original, false)}

                        {/* Retry indicator badge */}
                        {hasRetries && (
                          <button
                            onClick={() => toggleRetryGroupExpanded(group.original.id)}
                            className={cn(
                              "absolute -bottom-2 left-6 flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium transition-colors",
                              latestRun.status === "passed"
                                ? "bg-green-500/20 text-green-600 dark:text-green-400 hover:bg-green-500/30"
                                : "bg-amber-500/20 text-amber-600 dark:text-amber-400 hover:bg-amber-500/30"
                            )}
                          >
                            <RefreshCw className="h-3 w-3" />
                            {group.retries.length} {group.retries.length === 1 ? "retry" : "retries"}
                            {latestRun.status === "passed" && (
                              <CheckCircle className="h-3 w-3 ml-0.5" />
                            )}
                            {isRetryGroupExpanded ? (
                              <ChevronDown className="h-3 w-3" />
                            ) : (
                              <ChevronRight className="h-3 w-3" />
                            )}
                          </button>
                        )}
                      </div>

                      {/* Nested retry runs */}
                      {hasRetries && isRetryGroupExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="space-y-2 pt-3"
                        >
                          {group.retries.map((retry) => renderRun(retry, true))}
                        </motion.div>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
