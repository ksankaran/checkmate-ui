"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Bot,
  MessageSquare,
  Play,
  Settings,
  ExternalLink,
  Clock,
  CheckCircle,
  XCircle,
  Plus,
  FileText,
  ChevronRight,
  ChevronDown,
  Trash2,
  AlertTriangle,
  Filter,
  X,
  Loader2,
  Layers,
} from "lucide-react";
import { ThemeToggle } from "@/components/dashboard/ThemeToggle";
import { API_URL } from "@/lib/api";

interface Project {
  id: number;
  name: string;
  description: string | null;
  base_url: string;
  created_at: string;
  updated_at: string;
}

interface TestRun {
  id: number;
  status: string;
  trigger: string;
  thread_id: string | null;
  summary: string | null;
  pass_count: number;
  error_count: number;
  created_at: string;
  test_case_id: number | null;
}

interface TestCase {
  id: number;
  name: string;
  natural_query: string;
  priority: "high" | "medium" | "low";
  tags: string[] | string;
  steps: string;
  status: string;
  created_at: string;
}

interface Browser {
  id: string;
  name: string;
  headless: boolean;
}

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [testRuns, setTestRuns] = useState<TestRun[]>([]);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showAllTestCases, setShowAllTestCases] = useState(false);
  const [expandedSuites, setExpandedSuites] = useState<Set<string>>(new Set());

  // Tag filtering state
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isRunningBatch, setIsRunningBatch] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{
    currentTest: string;
    currentIndex: number;
    totalTests: number;
    completedTests: { id: number; name: string; status: string }[];
    skippedCount: number;
  } | null>(null);

  // Browser selection
  const [browsers, setBrowsers] = useState<Browser[]>([]);
  const [selectedBrowser, setSelectedBrowser] = useState<string | null>(null);

  useEffect(() => {
    fetchProject();
    fetchTestRuns();
    fetchTestCases();
    fetchBrowsers();
  }, [projectId]);

  async function fetchProject() {
    try {
      const res = await fetch(`${API_URL}/api/projects/${projectId}`);
      if (res.ok) {
        const data = await res.json();
        setProject(data);
      }
    } catch (error) {
      console.error("Failed to fetch project:", error);
    } finally {
      setLoading(false);
    }
  }

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

  async function fetchBrowsers() {
    try {
      const res = await fetch(`${API_URL}/api/test-runs/browsers`);
      if (res.ok) {
        const data = await res.json();
        setBrowsers(data.browsers || []);
        if (data.default && !selectedBrowser) {
          setSelectedBrowser(data.default);
        }
      }
    } catch (error) {
      console.error("Failed to fetch browsers:", error);
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
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

  async function handleDeleteProject() {
    setIsDeleting(true);
    try {
      const res = await fetch(`${API_URL}/api/projects/${projectId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        router.push("/");
      } else {
        console.error("Failed to delete project");
      }
    } catch (error) {
      console.error("Failed to delete project:", error);
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  }

  // Extract unique tags from all test cases
  const allTags = Array.from(
    new Set(
      testCases.flatMap((tc) => {
        if (Array.isArray(tc.tags)) return tc.tags;
        if (typeof tc.tags === "string") {
          try {
            return JSON.parse(tc.tags);
          } catch {
            return [];
          }
        }
        return [];
      })
    )
  ).sort();

  // Helper to parse steps from test case
  const getStepsCount = (tc: TestCase): number => {
    if (!tc.steps) return 0;
    try {
      const steps = typeof tc.steps === "string" ? JSON.parse(tc.steps) : tc.steps;
      return Array.isArray(steps) ? steps.length : 0;
    } catch {
      return 0;
    }
  };

  // Filter test cases by selected tags
  const filteredTestCases = selectedTags.length === 0
    ? testCases
    : testCases.filter((tc) => {
        const tcTags = Array.isArray(tc.tags)
          ? tc.tags
          : typeof tc.tags === "string"
          ? (() => {
              try {
                return JSON.parse(tc.tags);
              } catch {
                return [];
              }
            })()
          : [];
        return selectedTags.some((tag) => tcTags.includes(tag));
      });

  // Count how many filtered tests have steps
  const runnableTestCases = filteredTestCases.filter((tc) => getStepsCount(tc) > 0);
  const skippedCount = filteredTestCases.length - runnableTestCases.length;

  // Group test runs: suites grouped by batch_id, individual runs separate
  interface GroupedRun {
    type: "suite" | "individual";
    batchId?: string;
    runs: TestRun[];
    passCount: number;
    errorCount: number;
    latestRun: TestRun;
  }

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

    // Add suite groups
    suiteMap.forEach((runs, batchId) => {
      const passCount = runs.reduce((sum, r) => sum + r.pass_count, 0);
      const errorCount = runs.reduce((sum, r) => sum + r.error_count, 0);
      // Sort runs by created_at descending to get the latest
      const sortedRuns = [...runs].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      groups.push({
        type: "suite",
        batchId,
        runs: sortedRuns,
        passCount,
        errorCount,
        latestRun: sortedRuns[0],
      });
    });

    // Add individual runs
    individualRuns.forEach((run) => {
      groups.push({
        type: "individual",
        runs: [run],
        passCount: run.pass_count,
        errorCount: run.error_count,
        latestRun: run,
      });
    });

    // Sort all groups by latest run date
    groups.sort(
      (a, b) =>
        new Date(b.latestRun.created_at).getTime() -
        new Date(a.latestRun.created_at).getTime()
    );

    return groups;
  })();

  // Toggle suite expansion
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

  // Toggle tag selection
  function toggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  // Clear all selected tags
  function clearTags() {
    setSelectedTags([]);
  }

  // Run filtered test cases as a batch
  async function handleRunBatch() {
    if (runnableTestCases.length === 0) return;

    setIsRunningBatch(true);
    setBatchProgress({
      currentTest: "",
      currentIndex: 0,
      totalTests: runnableTestCases.length,
      completedTests: [],
      skippedCount: skippedCount,
    });

    try {
      const response = await fetch(
        `${API_URL}/api/test-cases/project/${projectId}/run-batch/stream`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            test_case_ids: runnableTestCases.map((tc) => tc.id),
            browser: selectedBrowser,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to start batch run");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("No response body");
      }

      // Buffer for handling chunked SSE data
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process complete messages (SSE messages end with \n\n)
        const messages = buffer.split("\n\n");
        // Keep the last incomplete message in the buffer
        buffer = messages.pop() || "";

        for (const message of messages) {
          const lines = message.split("\n");
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));

                if (data.type === "test_started") {
                  setBatchProgress((prev) =>
                    prev
                      ? {
                          ...prev,
                          currentTest: data.name,
                          currentIndex: data.index,
                        }
                      : null
                  );
                } else if (data.type === "test_completed") {
                  const testCase = runnableTestCases.find(
                    (tc) => tc.id === data.test_case_id
                  );
                  setBatchProgress((prev) =>
                    prev
                      ? {
                          ...prev,
                          completedTests: [
                            ...prev.completedTests,
                            {
                              id: data.test_case_id,
                              name: testCase?.name || `Test #${data.test_case_id}`,
                              status: data.status,
                            },
                          ],
                        }
                      : null
                  );
                } else if (data.type === "batch_completed") {
                  // Refresh test runs after batch completes
                  fetchTestRuns();
                }
              } catch (e) {
                console.error("Failed to parse SSE data:", e);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error("Batch run failed:", error);
    } finally {
      setIsRunningBatch(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Project not found</h2>
          <Link href="/" className="text-primary hover:underline">
            Go back home
          </Link>
        </div>
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
              href="/"
              className="p-2 rounded-lg hover:bg-muted transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="flex items-center gap-3">
              <img src="/checkmate-icon.png" alt="Checkmate" className="h-6 w-6" />
              <h1 className="text-lg font-semibold">{project.name}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={project.base_url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg hover:bg-muted transition-colors"
              title="Open application"
            >
              <ExternalLink className="h-5 w-5" />
            </a>
            <button
              onClick={() => setShowDeleteDialog(true)}
              className="p-2 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors"
              title="Delete project"
            >
              <Trash2 className="h-5 w-5" />
            </button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Delete Confirmation Dialog */}
      {showDeleteDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card border border-border rounded-lg p-6 max-w-md w-full mx-4"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-full bg-red-500/10">
                <AlertTriangle className="h-6 w-6 text-red-500" />
              </div>
              <h3 className="text-lg font-semibold">Delete Project?</h3>
            </div>
            <p className="text-muted-foreground mb-2">
              Are you sure you want to delete <strong>{project.name}</strong>?
            </p>
            <div className="text-sm text-muted-foreground mb-6">
              <p className="mb-2">This will permanently delete:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>{testCases.length} test case{testCases.length !== 1 ? "s" : ""}</li>
                <li>{testRuns.length} test run{testRuns.length !== 1 ? "s" : ""}</li>
              </ul>
            </div>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowDeleteDialog(false)}
                className="px-4 py-2 rounded-lg border border-border hover:bg-muted transition-colors"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteProject}
                disabled={isDeleting}
                className="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Delete Project"}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Batch Run Progress Modal */}
      {batchProgress && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card border border-border rounded-lg p-6 max-w-lg w-full mx-4 max-h-[80vh] overflow-hidden flex flex-col"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                Running Test Suite
              </h3>
              {!isRunningBatch && (
                <button
                  onClick={() => setBatchProgress(null)}
                  className="p-1 rounded hover:bg-muted transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>

            {/* Progress bar */}
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">
                  {isRunningBatch
                    ? `Running: ${batchProgress.currentTest}`
                    : "Complete"}
                </span>
                <span className="font-medium">
                  {batchProgress.completedTests.length} / {batchProgress.totalTests}
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-primary"
                  initial={{ width: 0 }}
                  animate={{
                    width: `${(batchProgress.completedTests.length / batchProgress.totalTests) * 100}%`,
                  }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>

            {/* Results list */}
            <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
              {batchProgress.completedTests.map((test) => (
                <div
                  key={test.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
                >
                  {test.status === "passed" ? (
                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                  ) : test.status === "failed" ? (
                    <XCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                  ) : (
                    <Clock className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  )}
                  <span className="text-sm truncate">{test.name}</span>
                </div>
              ))}
              {isRunningBatch && batchProgress.currentTest && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/10 border border-primary/20">
                  <Loader2 className="h-5 w-5 text-primary animate-spin flex-shrink-0" />
                  <span className="text-sm truncate">{batchProgress.currentTest}</span>
                </div>
              )}
            </div>

            {/* Summary when complete */}
            {!isRunningBatch && (
              <div className="mt-4 pt-4 border-t border-border">
                <div className="flex items-center justify-between">
                  <div className="flex gap-4 text-sm">
                    <span className="text-green-500">
                      {batchProgress.completedTests.filter((t) => t.status === "passed").length} passed
                    </span>
                    <span className="text-red-500">
                      {batchProgress.completedTests.filter((t) => t.status === "failed").length} failed
                    </span>
                    {batchProgress.skippedCount > 0 && (
                      <span className="text-yellow-500">
                        {batchProgress.skippedCount} skipped (no steps)
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => setBatchProgress(null)}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}

      <main className="container mx-auto px-6 py-8">
        {/* Project Info */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg border border-border bg-card p-6 mb-8"
        >
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-2">{project.name}</h2>
              <p className="text-muted-foreground mb-4">
                {project.description || "No description"}
              </p>
              <p className="text-sm font-mono text-muted-foreground">
                {project.base_url}
              </p>
            </div>
            <Link
              href={`/projects/${projectId}/chat`}
              className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              <MessageSquare className="h-5 w-5" />
              Start Testing
            </Link>
          </div>
        </motion.div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Link href={`/projects/${projectId}/chat`}>
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="p-6 rounded-lg border border-border bg-card hover:border-primary/50 transition-colors cursor-pointer"
            >
              <MessageSquare className="h-8 w-8 text-primary mb-4" />
              <h3 className="font-semibold mb-1">Natural Language Testing</h3>
              <p className="text-sm text-muted-foreground">
                Ask questions like "Is login working?"
              </p>
            </motion.div>
          </Link>

          <Link href={`/projects/${projectId}/build`}>
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="p-6 rounded-lg border border-border bg-card hover:border-primary/50 transition-colors cursor-pointer"
            >
              <Bot className="h-8 w-8 text-primary mb-4" />
              <h3 className="font-semibold mb-1">Build Test Case</h3>
              <p className="text-sm text-muted-foreground">
                Build test cases with natural language
              </p>
            </motion.div>
          </Link>

          <Link href={`/projects/${projectId}/settings`}>
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="p-6 rounded-lg border border-border bg-card hover:border-primary/50 transition-colors cursor-pointer"
            >
              <Settings className="h-8 w-8 text-primary mb-4" />
              <h3 className="font-semibold mb-1">Project Settings</h3>
              <p className="text-sm text-muted-foreground">
                Configure personas, pages, and more
              </p>
            </motion.div>
          </Link>
        </div>

        {/* Test Cases */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Test Cases</h3>
            <Link
              href={`/projects/${projectId}/test-cases/new`}
              className="flex items-center gap-2 text-sm text-primary hover:text-primary/80"
            >
              <Plus className="h-4 w-4" />
              Add Test Case
            </Link>
          </div>

          {/* Tag Filter */}
          {allTags.length > 0 && (
            <div className="mb-4 p-4 rounded-lg border border-border bg-card">
              <div className="flex items-center gap-2 mb-3">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Filter by tag:</span>
                {selectedTags.length > 0 && (
                  <button
                    onClick={clearTags}
                    className="text-xs text-muted-foreground hover:text-foreground ml-2"
                  >
                    Clear all
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {allTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`px-3 py-1 text-sm rounded-full transition-colors ${
                      selectedTags.includes(tag)
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
              {selectedTags.length > 0 && (
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
                  <div className="text-sm">
                    <span className="text-muted-foreground">
                      Showing {filteredTestCases.length} of {testCases.length} test cases
                    </span>
                    {skippedCount > 0 && (
                      <span className="text-yellow-500 ml-2">
                        ({skippedCount} without steps)
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Browser selector */}
                    {browsers.length > 0 && (
                      <div className="relative">
                        <select
                          value={selectedBrowser || ""}
                          onChange={(e) => setSelectedBrowser(e.target.value)}
                          disabled={isRunningBatch}
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
                      onClick={handleRunBatch}
                      disabled={isRunningBatch || runnableTestCases.length === 0}
                      className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                      {isRunningBatch ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Running...
                        </>
                      ) : runnableTestCases.length === 0 ? (
                        <>
                          <Play className="h-4 w-4" />
                          No runnable tests
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4" />
                          Run {runnableTestCases.length} Test{runnableTestCases.length !== 1 ? "s" : ""}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
          {filteredTestCases.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-border rounded-lg">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h4 className="text-lg font-medium mb-2">
                {selectedTags.length > 0 ? "No matching test cases" : "No test cases yet"}
              </h4>
              <p className="text-muted-foreground mb-4">
                {selectedTags.length > 0
                  ? "Try selecting different tags or clear the filter"
                  : "Create test cases manually or generate them with AI"}
              </p>
              {selectedTags.length === 0 && (
                <div className="flex items-center justify-center gap-3">
                  <Link
                    href={`/projects/${projectId}/test-cases/new`}
                    className="inline-flex items-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    Create Manually
                  </Link>
                  <Link
                    href={`/projects/${projectId}/build`}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    <Bot className="h-4 w-4" />
                    Build with AI
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {(showAllTestCases ? filteredTestCases : filteredTestCases.slice(0, 5)).map((tc) => (
                <Link key={tc.id} href={`/projects/${projectId}/test-cases/${tc.id}`}>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="p-4 rounded-lg border border-border bg-card flex items-center justify-between hover:border-primary/30 transition-colors cursor-pointer"
                  >
                  <div className="flex items-center gap-4">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{tc.name}</p>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${getPriorityColor(
                            tc.priority
                          )}`}
                        >
                          {tc.priority}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {tc.natural_query}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {tc.tags && (Array.isArray(tc.tags) ? tc.tags : []).length > 0 && (
                      <div className="flex gap-1">
                        {(Array.isArray(tc.tags) ? tc.tags : []).slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                  </motion.div>
                </Link>
              ))}
              {filteredTestCases.length > 5 && !showAllTestCases && (
                <button
                  onClick={() => setShowAllTestCases(true)}
                  className="w-full text-sm text-primary hover:text-primary/80 text-center py-2 hover:bg-muted rounded-lg transition-colors"
                >
                  Show {filteredTestCases.length - 5} more test cases
                </button>
              )}
              {showAllTestCases && filteredTestCases.length > 5 && (
                <button
                  onClick={() => setShowAllTestCases(false)}
                  className="w-full text-sm text-muted-foreground hover:text-foreground text-center py-2 hover:bg-muted rounded-lg transition-colors"
                >
                  Show less
                </button>
              )}
            </div>
          )}
        </section>

        {/* Recent Test Runs */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Recent Test Runs</h3>
            {testRuns.length > 0 && (
              <Link
                href={`/projects/${projectId}/runs`}
                className="text-sm text-primary hover:text-primary/80"
              >
                View all
              </Link>
            )}
          </div>
          {testRuns.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-border rounded-lg">
              <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h4 className="text-lg font-medium mb-2">No test runs yet</h4>
              <p className="text-muted-foreground mb-4">
                Start testing to see results here
              </p>
              <Link
                href={`/projects/${projectId}/chat`}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                <Play className="h-4 w-4" />
                Start Testing
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {groupedTestRuns.slice(0, 10).map((group) => {
                if (group.type === "suite") {
                  const isExpanded = expandedSuites.has(group.batchId!);
                  const allPassed = group.runs.every((r) => r.status === "passed");
                  const anyFailed = group.runs.some((r) => r.status === "failed");

                  return (
                    <motion.div
                      key={group.batchId}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="rounded-lg border border-border bg-card overflow-hidden"
                    >
                      {/* Suite Header - Clickable to expand */}
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
                              {new Date(group.latestRun.created_at).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-sm text-green-500">
                            {group.runs.filter((r) => r.status === "passed").length} passed
                          </span>
                          {group.runs.filter((r) => r.status === "failed").length > 0 && (
                            <span className="text-sm text-red-500">
                              {group.runs.filter((r) => r.status === "failed").length} failed
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
                          className="border-t border-border bg-muted/30"
                        >
                          <div className="p-2 space-y-1">
                            {group.runs.map((run) => {
                              const testCase = run.test_case_id
                                ? testCases.find((tc) => tc.id === run.test_case_id)
                                : null;
                              return (
                                <Link
                                  key={run.id}
                                  href={`/projects/${projectId}/runs?runId=${run.id}`}
                                  className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors"
                                >
                                  <div className="flex items-center gap-3">
                                    {run.status === "passed" ? (
                                      <CheckCircle className="h-4 w-4 text-green-500" />
                                    ) : run.status === "failed" ? (
                                      <XCircle className="h-4 w-4 text-red-500" />
                                    ) : (
                                      <Clock className="h-4 w-4 text-muted-foreground" />
                                    )}
                                    <span className="text-sm">
                                      {testCase?.name || `Test #${run.test_case_id}`}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <span>{run.pass_count} steps passed</span>
                                    {run.error_count > 0 && (
                                      <span className="text-red-500">{run.error_count} failed</span>
                                    )}
                                    <ChevronRight className="h-4 w-4" />
                                  </div>
                                </Link>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </motion.div>
                  );
                }

                // Individual run
                const run = group.latestRun;
                const testCase = run.test_case_id
                  ? testCases.find((tc) => tc.id === run.test_case_id)
                  : null;

                return (
                  <Link key={run.id} href={`/projects/${projectId}/runs?runId=${run.id}`}>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="p-4 rounded-lg border border-border bg-card flex items-center justify-between hover:border-primary/30 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-4">
                        {run.status === "passed" ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : run.status === "failed" ? (
                          <XCircle className="h-5 w-5 text-red-500" />
                        ) : (
                          <Clock className="h-5 w-5 text-muted-foreground" />
                        )}
                        <div>
                          <p className="font-medium">
                            {testCase?.name || run.summary || `Test Run #${run.id}`}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(run.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-green-500">
                          {run.pass_count} passed
                        </span>
                        {run.error_count > 0 && (
                          <span className="text-sm text-red-500">
                            {run.error_count} failed
                          </span>
                        )}
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </motion.div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
