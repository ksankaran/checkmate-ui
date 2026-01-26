"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Play,
  Pencil,
  Trash2,
  AlertTriangle,
  CheckCircle,
  Clock,
  History,
  ChevronDown,
} from "lucide-react";
import { ThemeToggle } from "@/components/dashboard/ThemeToggle";
import { cn } from "@/lib/utils";
import { API_URL } from "@/lib/api";

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
  priority: "high" | "medium" | "low";
  tags: string[] | string;
  status: string;
  steps: string | TestStep[];
  expected_result: string | null;
  created_at: string;
  updated_at: string;
}

interface Project {
  id: number;
  name: string;
  base_url: string;
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
  screenshot: "Screenshot",
  assert_text: "Assert Text",
  assert_element: "Assert Element",
  back: "Go Back",
  evaluate: "Evaluate JS",
  upload: "Upload",
  drag: "Drag & Drop",
};

export default function TestCaseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  const testCaseId = params.testCaseId as string;

  const [testCase, setTestCase] = useState<TestCase | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Browser selection
  const [browsers, setBrowsers] = useState<Browser[]>([]);
  const [selectedBrowser, setSelectedBrowser] = useState<string | null>(null);

  useEffect(() => {
    fetchTestCase();
    fetchProject();
    fetchBrowsers();
  }, [projectId, testCaseId]);

  async function fetchTestCase() {
    try {
      const res = await fetch(
        `${API_URL}/api/test-cases/${testCaseId}`
      );
      if (res.ok) {
        const data = await res.json();
        setTestCase(data);
      }
    } catch (error) {
      console.error("Failed to fetch test case:", error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchProject() {
    try {
      const res = await fetch(`${API_URL}/api/projects/${projectId}`);
      if (res.ok) {
        const data = await res.json();
        setProject(data);
      }
    } catch (error) {
      console.error("Failed to fetch project:", error);
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

  async function handleDelete() {
    setIsDeleting(true);
    try {
      const res = await fetch(
        `${API_URL}/api/test-cases/${testCaseId}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        router.push(`/projects/${projectId}`);
      }
    } catch (error) {
      console.error("Failed to delete test case:", error);
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
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

  const parseSteps = (): TestStep[] => {
    if (!testCase?.steps) return [];
    if (Array.isArray(testCase.steps)) return testCase.steps;
    try {
      return JSON.parse(testCase.steps);
    } catch {
      return [];
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!testCase) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Test case not found</h2>
          <Link
            href={`/projects/${projectId}`}
            className="text-primary hover:underline"
          >
            Go back to project
          </Link>
        </div>
      </div>
    );
  }

  const steps = parseSteps();
  const tags = parseTags();

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
              <h1 className="text-lg font-semibold">{testCase.name}</h1>
              <p className="text-xs text-muted-foreground">
                {project?.name}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/projects/${projectId}/test-cases/${testCaseId}/runs`}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
              title="Run history"
            >
              <History className="h-5 w-5" />
            </Link>
            <Link
              href={`/projects/${projectId}/test-cases/${testCaseId}/edit`}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
              title="Edit test case"
            >
              <Pencil className="h-5 w-5" />
            </Link>
            <button
              onClick={() => setShowDeleteDialog(true)}
              className="p-2 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors"
              title="Delete test case"
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
              <h3 className="text-lg font-semibold">Delete Test Case?</h3>
            </div>
            <p className="text-muted-foreground mb-6">
              Are you sure you want to delete <strong>{testCase.name}</strong>?
              This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowDeleteDialog(false)}
                className="px-4 py-2 rounded-lg border border-border hover:bg-muted transition-colors"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      <main className="container mx-auto max-w-4xl px-6 py-8">
        {/* Test Case Info */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg border border-border bg-card p-6 mb-6"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h2 className="text-xl font-bold mb-2">{testCase.name}</h2>
              <p className="text-muted-foreground">{testCase.natural_query}</p>
            </div>
            <div className="flex items-center gap-2">
              {/* Browser selector */}
              {browsers.length > 0 && (
                <div className="relative">
                  <select
                    value={selectedBrowser || ""}
                    onChange={(e) => setSelectedBrowser(e.target.value)}
                    className="appearance-none px-3 py-2 pr-8 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
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
              <Link
                href={`/projects/${projectId}/test-cases/${testCaseId}/runs?autorun=true${selectedBrowser ? `&browser=${selectedBrowser}` : ''}`}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                <Play className="h-4 w-4" />
                Run Test
              </Link>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span
              className={`text-xs px-2 py-1 rounded-full ${getPriorityColor(
                testCase.priority
              )}`}
            >
              {testCase.priority}
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

          <div className="text-xs text-muted-foreground">
            Created {new Date(testCase.created_at).toLocaleDateString()}
            {testCase.updated_at !== testCase.created_at && (
              <> · Updated {new Date(testCase.updated_at).toLocaleDateString()}</>
            )}
          </div>
        </motion.div>

        {/* Test Steps */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-lg border border-border bg-card p-6"
        >
          <h3 className="text-lg font-semibold mb-4">
            Test Steps ({steps.length})
          </h3>
          <div className="space-y-3">
            {steps.map((step, index) => (
              <div
                key={index}
                className="flex items-start gap-4 p-4 rounded-lg bg-muted/50"
              >
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-medium text-sm shrink-0">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary font-medium">
                      {ACTION_LABELS[step.action] || step.action}
                    </span>
                  </div>
                  <p className="text-sm font-medium">{step.description}</p>
                  {(step.target || step.value) && (
                    <div className="mt-2 text-xs text-muted-foreground font-mono">
                      {step.target && (
                        <div>
                          <span className="text-muted-foreground/70">target:</span>{" "}
                          {step.target}
                        </div>
                      )}
                      {step.value && (
                        <div>
                          <span className="text-muted-foreground/70">value:</span>{" "}
                          {step.value}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Expected Result */}
        {testCase.expected_result && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-lg border border-border bg-card p-6 mt-6"
          >
            <h3 className="text-lg font-semibold mb-2">Expected Result</h3>
            <p className="text-muted-foreground">{testCase.expected_result}</p>
          </motion.div>
        )}
      </main>
    </div>
  );
}
