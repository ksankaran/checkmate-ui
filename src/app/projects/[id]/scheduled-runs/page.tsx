"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  ChevronDown,
  ChevronRight,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { ThemeToggle } from "@/components/dashboard/ThemeToggle";
import { API_URL } from "@/lib/api";

interface Project {
  id: number;
  name: string;
}

interface ScheduledRun {
  id: number;
  schedule_id: number;
  project_id: number;
  thread_id: string;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  test_count: number;
  pass_count: number;
  fail_count: number;
  notifications_sent: string | null;
  notification_errors: string | null;
  created_at: string;
  schedule_name: string;
}

interface TestRun {
  id: number;
  test_case_id: number;
  test_case_name: string;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  pass_count: number;
  error_count: number;
}

function formatDuration(startedAt: string | null, completedAt: string | null): string {
  if (!startedAt || !completedAt) return "-";
  const start = new Date(startedAt);
  const end = new Date(completedAt);
  const seconds = Math.floor((end.getTime() - start.getTime()) / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

function formatDateTime(dateString: string | null): string {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleString();
}

export default function ScheduledRunsPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [scheduledRuns, setScheduledRuns] = useState<ScheduledRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRuns, setExpandedRuns] = useState<Set<number>>(new Set());
  const [runDetails, setRunDetails] = useState<Record<number, TestRun[]>>({});
  const [loadingDetails, setLoadingDetails] = useState<Set<number>>(new Set());

  useEffect(() => {
    fetchProject();
    fetchScheduledRuns();
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
    }
  }

  async function fetchScheduledRuns() {
    try {
      const res = await fetch(`${API_URL}/api/projects/${projectId}/scheduled-runs`);
      if (res.ok) {
        const data = await res.json();
        setScheduledRuns(data);
      }
    } catch (error) {
      console.error("Failed to fetch scheduled runs:", error);
    } finally {
      setLoading(false);
    }
  }

  async function toggleExpand(runId: number, threadId: string) {
    const newExpanded = new Set(expandedRuns);

    if (newExpanded.has(runId)) {
      newExpanded.delete(runId);
    } else {
      newExpanded.add(runId);

      // Load details if not already loaded
      if (!runDetails[runId]) {
        setLoadingDetails(prev => new Set(prev).add(runId));
        try {
          // Fetch test runs with this thread_id
          const res = await fetch(`${API_URL}/api/test-runs/project/${projectId}?thread_id=${threadId}`);
          if (res.ok) {
            const data = await res.json();
            setRunDetails(prev => ({ ...prev, [runId]: data }));
          }
        } catch (error) {
          console.error("Failed to fetch run details:", error);
        } finally {
          setLoadingDetails(prev => {
            const newSet = new Set(prev);
            newSet.delete(runId);
            return newSet;
          });
        }
      }
    }

    setExpandedRuns(newExpanded);
  }

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
      <header className="border-b border-border sticky top-0 bg-background z-10">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href={`/projects/${projectId}/settings`}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="flex items-center gap-3">
              <Calendar className="h-6 w-6 text-primary" />
              <div>
                <h1 className="text-lg font-semibold">Scheduled Runs</h1>
                <p className="text-sm text-muted-foreground">
                  {project?.name || "Project"}
                </p>
              </div>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="container mx-auto px-6 py-8 max-w-5xl">
        {scheduledRuns.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-border rounded-lg">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No scheduled runs yet</h3>
            <p className="text-muted-foreground mb-4">
              Scheduled runs will appear here once your schedules execute.
            </p>
            <Link
              href={`/projects/${projectId}/settings`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              <Calendar className="h-4 w-4" />
              Configure Schedules
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {scheduledRuns.map((run) => (
              <div
                key={run.id}
                className="border border-border rounded-lg overflow-hidden"
              >
                {/* Run Header */}
                <button
                  onClick={() => toggleExpand(run.id, run.thread_id)}
                  className="w-full px-4 py-3 flex items-center gap-4 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {expandedRuns.has(run.id) ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                    {run.status === "passed" ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : run.status === "failed" ? (
                      <XCircle className="h-5 w-5 text-red-500" />
                    ) : run.status === "running" ? (
                      <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
                    ) : (
                      <Clock className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>

                  <div className="flex-1 text-left">
                    <div className="font-medium">{run.schedule_name}</div>
                    <div className="text-sm text-muted-foreground">
                      {formatDateTime(run.started_at)}
                    </div>
                  </div>

                  <div className="flex items-center gap-6 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Tests:</span>
                      <span className="font-medium">{run.test_count}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-green-500">{run.pass_count} passed</span>
                      {run.fail_count > 0 && (
                        <span className="text-red-500">{run.fail_count} failed</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      {formatDuration(run.started_at, run.completed_at)}
                    </div>
                  </div>
                </button>

                {/* Expanded Details */}
                <AnimatePresence>
                  {expandedRuns.has(run.id) && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-border bg-muted/20"
                    >
                      <div className="p-4">
                        {loadingDetails.has(run.id) ? (
                          <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                          </div>
                        ) : runDetails[run.id]?.length > 0 ? (
                          <div className="space-y-2">
                            {runDetails[run.id].map((testRun) => (
                              <div
                                key={testRun.id}
                                className="flex items-center gap-4 p-3 bg-background rounded-lg border border-border"
                              >
                                <div className="flex items-center gap-2">
                                  {testRun.status === "passed" ? (
                                    <CheckCircle className="h-4 w-4 text-green-500" />
                                  ) : testRun.status === "failed" ? (
                                    <XCircle className="h-4 w-4 text-red-500" />
                                  ) : (
                                    <Clock className="h-4 w-4 text-muted-foreground" />
                                  )}
                                </div>
                                <div className="flex-1">
                                  <div className="font-medium text-sm">
                                    {testRun.test_case_name || `Test Case #${testRun.test_case_id}`}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {testRun.pass_count} passed, {testRun.error_count} failed
                                  </div>
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {formatDuration(testRun.started_at, testRun.completed_at)}
                                </div>
                                <Link
                                  href={`/projects/${projectId}/runs?runId=${testRun.id}`}
                                  className="p-2 rounded hover:bg-muted transition-colors"
                                  title="View Details"
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </Link>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-center py-4 text-muted-foreground">
                            No test run details available
                          </p>
                        )}

                        {/* Notification Status */}
                        {(run.notifications_sent || run.notification_errors) && (
                          <div className="mt-4 pt-4 border-t border-border">
                            <h4 className="text-sm font-medium mb-2">Notifications</h4>
                            {run.notifications_sent && (
                              <div className="text-sm text-green-500">
                                Sent to {JSON.parse(run.notifications_sent).length} channel(s)
                              </div>
                            )}
                            {run.notification_errors && (
                              <div className="text-sm text-red-500">
                                {Object.keys(JSON.parse(run.notification_errors)).length} notification(s) failed
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
