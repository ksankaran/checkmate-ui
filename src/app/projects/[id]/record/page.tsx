"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Video,
  Save,
  ChevronDown,
  Loader2,
  ExternalLink,
  Monitor,
} from "lucide-react";
import { ThemeToggle } from "@/components/dashboard/ThemeToggle";
import { cn } from "@/lib/utils";
import { API_URL } from "@/lib/api";
import { recorderApi } from "@/lib/api/recorder";
import { useEnvironment } from "@/context/EnvironmentContext";
import { useRecorderWebSocket } from "@/hooks/useRecorderWebSocket";
import { RecordingControls } from "@/components/recorder/RecordingControls";
import { RecordedStepList } from "@/components/recorder/RecordedStepList";
import { RecordingStatus } from "@/components/recorder/RecordingStatus";
import type { RecordedStep, StepCoordinates } from "@/types/recorder";

const PRIORITIES = [
  { value: "critical", label: "Critical" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

interface EditableStep {
  id: string;
  action: string;
  target: string;
  value: string;
  description: string;
  is_credential: boolean;
  coordinates?: StepCoordinates | null;
  locators?: Record<string, any> | null;
  causes_navigation?: boolean;
}

interface Project {
  id: number;
  name: string;
  description: string | null;
  base_url: string;
}

export default function RecordPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const { activeEnv } = useEnvironment();

  // Project state
  const [project, setProject] = useState<Project | null>(null);
  const [baseUrl, setBaseUrl] = useState("");

  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);

  // Test case metadata
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [tags, setTags] = useState("");

  // Steps (editable copies of recorded steps)
  const [editableSteps, setEditableSteps] = useState<EditableStep[]>([]);

  // Save state
  const [isSaving, setIsSaving] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [isGeneratingMetadata, setIsGeneratingMetadata] = useState(false);
  const [error, setError] = useState("");

  // WebSocket
  const { steps: rawSteps, status: wsStatus, isPaused, connect, disconnect, pause, resume, clearSteps } =
    useRecorderWebSocket();

  // Fetch project info
  useEffect(() => {
    async function fetchProject() {
      try {
        const res = await fetch(`${API_URL}/api/projects/${projectId}`);
        if (res.ok) {
          const data = await res.json();
          setProject(data);
          setBaseUrl(activeEnv?.base_url || data.base_url || "");
        }
      } catch (err) {
        console.error("Failed to fetch project:", err);
      }
    }
    fetchProject();
  }, [projectId, activeEnv]);

  // Convert raw steps from WebSocket into editable steps
  useEffect(() => {
    if (rawSteps.length === 0) return;
    setEditableSteps(
      rawSteps.map((s) => ({
        id: crypto.randomUUID(),
        action: s.action,
        target: s.target || "",
        value: s.value || "",
        description: s.description || "",
        is_credential: s.is_credential || false,
        coordinates: s.coordinates || null,
        locators: s.locators || null,
        causes_navigation: s.causes_navigation || false,
      }))
    );
  }, [rawSteps]);

  const handleStart = useCallback(async () => {
    if (!baseUrl.trim()) {
      setError("Please enter a URL to record");
      return;
    }
    setError("");
    setIsStarting(true);

    try {
      const result = await recorderApi.startSession(parseInt(projectId), {
        base_url: baseUrl.trim(),
      });

      setIsRecording(true);
      clearSteps();
      setEditableSteps([]);

      // Connect WebSocket for live step streaming
      connect(projectId);
    } catch (err: any) {
      const detail = err?.body?.detail || err.message || "Failed to start recording";
      setError(detail);
    } finally {
      setIsStarting(false);
    }
  }, [baseUrl, projectId, connect, clearSteps]);

  const handleStop = useCallback(async () => {
    setIsStopping(true);
    try {
      const result = await recorderApi.stopSession(parseInt(projectId));
      setIsRecording(false);
      disconnect();

      // Use the final steps from the stop response if available
      const finalSteps = result.steps && result.steps.length > 0
        ? result.steps
        : rawSteps;

      if (finalSteps.length > 0) {
        // Show raw steps immediately so user sees progress
        setEditableSteps(
          finalSteps.map((s) => ({
            id: crypto.randomUUID(),
            action: s.action,
            target: s.target || "",
            value: s.value || "",
            description: s.description || "",
            is_credential: s.is_credential || false,
            coordinates: s.coordinates || null,
            locators: s.locators || null,
            causes_navigation: s.causes_navigation || false,
          }))
        );

        const stepsPayload = finalSteps.map((s) => ({
          action: s.action,
          target: s.target,
          value: s.value,
          description: s.description,
          is_credential: s.is_credential,
          coordinates: s.coordinates || null,
          locators: s.locators || null,
          causes_navigation: s.causes_navigation || false,
        }));

        // Step 1: AI-refine the raw steps into builder-quality steps
        setIsRefining(true);
        let refinedSteps = stepsPayload;
        try {
          const refined = await recorderApi.refineSteps(
            parseInt(projectId),
            stepsPayload,
            baseUrl,
          );
          if (refined.steps && refined.steps.length > 0) {
            refinedSteps = refined.steps.map((s) => ({
              ...s,
              is_credential: false,
              coordinates: s.coordinates ?? null,
              locators: s.locators ?? null,
              causes_navigation: s.causes_navigation ?? false,
            }));
            setEditableSteps(
              refined.steps.map((s) => ({
                id: crypto.randomUUID(),
                action: s.action,
                target: s.target || "",
                value: s.value || "",
                description: s.description || "",
                is_credential: false,
                coordinates: s.coordinates || null,
                locators: s.locators || null,
                causes_navigation: s.causes_navigation || false,
              }))
            );
          }
        } catch (err) {
          console.error("Failed to refine steps:", err);
          // Non-blocking — raw steps are already shown
        } finally {
          setIsRefining(false);
        }

        // Step 2: Auto-generate test case metadata via AI
        setIsGeneratingMetadata(true);
        try {
          const metadata = await recorderApi.generateMetadata(
            parseInt(projectId),
            refinedSteps,
            baseUrl,
          );
          setName(metadata.name);
          setDescription(metadata.description);
          setPriority(metadata.priority);
          setTags(metadata.tags.join(", "));
        } catch (err) {
          console.error("Failed to generate metadata:", err);
        } finally {
          setIsGeneratingMetadata(false);
        }
      }
    } catch (err: any) {
      console.error("Failed to stop recording:", err);
    } finally {
      setIsStopping(false);
    }
  }, [projectId, disconnect, rawSteps, baseUrl]);

  const handleDiscard = useCallback(() => {
    setEditableSteps([]);
    clearSteps();
    setName("");
    setDescription("");
    setTags("");
    setError("");
  }, [clearSteps]);

  const handleSave = useCallback(async () => {
    if (!name.trim()) {
      setError("Please provide a test case name");
      return;
    }
    if (editableSteps.length === 0) {
      setError("No steps to save. Record some interactions first.");
      return;
    }

    setError("");
    setIsSaving(true);

    try {
      const testCase = {
        project_id: parseInt(projectId),
        name: name.trim(),
        natural_query: description.trim() || `Recorded test: ${name.trim()}`,
        priority,
        tags: JSON.stringify(
          tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
        ),
        steps: JSON.stringify(
          editableSteps.map((s) => ({
            action: s.action,
            target: s.target || null,
            value: s.value || null,
            description: s.description,
            coordinates: s.coordinates || null,
            locators: s.locators || null,
            ...(s.causes_navigation ? { causes_navigation: true } : {}),
          }))
        ),
      };

      const res = await fetch(`${API_URL}/api/test-cases`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(testCase),
      });

      if (res.ok) {
        const saved = await res.json();
        router.push(`/projects/${projectId}/test-cases/${saved.id}`);
      } else {
        const data = await res.json();
        setError(data.detail || "Failed to save test case");
      }
    } catch {
      setError("Failed to connect to server");
    } finally {
      setIsSaving(false);
    }
  }, [name, description, priority, tags, editableSteps, projectId, router]);

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border shrink-0">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href={`/projects/${projectId}`}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="flex items-center gap-3">
              <Video className="h-6 w-6 text-primary" />
              <div>
                <h1 className="text-lg font-semibold">Record Test Case</h1>
                <p className="text-xs text-muted-foreground">
                  {project?.name || "Loading..."}
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isRecording && editableSteps.length > 0 && (
              <button
                onClick={handleSave}
                disabled={isSaving || !name.trim()}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {isSaving ? "Saving..." : "Save Test Case"}
              </button>
            )}
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content — Split Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel: Recording Controls + Status */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-2xl mx-auto space-y-6">
            {/* URL Bar + Controls */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-lg border border-border bg-card p-5"
            >
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    Target URL
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={baseUrl}
                      onChange={(e) => setBaseUrl(e.target.value)}
                      placeholder="https://your-app.com"
                      disabled={isRecording}
                      className="flex-1 px-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-60"
                    />
                    {baseUrl && !isRecording && (
                      <a
                        href={baseUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
                        title="Open in browser"
                      >
                        <ExternalLink className="h-5 w-5" />
                      </a>
                    )}
                  </div>
                  {activeEnv && (
                    <p className="text-xs text-muted-foreground">
                      Using{" "}
                      <span className="font-medium text-foreground">
                        {activeEnv.name}
                      </span>{" "}
                      environment URL. Switch environments from the top bar.
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <RecordingControls
                    isRecording={isRecording}
                    isStarting={isStarting}
                    isStopping={isStopping}
                    isPaused={isPaused}
                    hasSteps={editableSteps.length > 0}
                    onStart={handleStart}
                    onStop={handleStop}
                    onPause={pause}
                    onResume={resume}
                    onDiscard={handleDiscard}
                  />
                  <RecordingStatus
                    connectionStatus={wsStatus}
                    isRecording={isRecording}
                    stepCount={editableSteps.length}
                  />
                </div>
              </div>
            </motion.div>

            {/* Browser Status Panel */}
            {isRecording && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "rounded-lg border border-dashed p-8 text-center",
                  isPaused
                    ? "border-amber-400/40 bg-amber-50/40 dark:bg-amber-950/20"
                    : "border-primary/30 bg-primary/5"
                )}
              >
                <Monitor className={cn(
                  "h-12 w-12 mx-auto mb-3",
                  isPaused ? "text-amber-400/70" : "text-primary/50"
                )} />
                {isPaused ? (
                  <>
                    <h3 className="font-medium mb-1 text-amber-700 dark:text-amber-400">
                      Recording paused
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Edit your steps in the right panel, then click{" "}
                      <span className="font-medium text-foreground">Resume</span> to
                      continue capturing.
                    </p>
                  </>
                ) : (
                  <>
                    <h3 className="font-medium mb-1">Browser window is open</h3>
                    <p className="text-sm text-muted-foreground">
                      Interact with your application in the Chromium window.
                      <br />
                      Your actions are being captured as test steps in the right panel.
                    </p>
                  </>
                )}
              </motion.div>
            )}

            {/* Test Case Info (shown after recording stops, before save) */}
            {!isRecording && editableSteps.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-lg border border-border bg-card p-5 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    Test Case Info
                  </h2>
                  {(isRefining || isGeneratingMetadata) && (
                    <div className="flex items-center gap-2 text-sm text-primary">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      {isRefining ? "AI refining steps..." : "AI generating metadata..."}
                    </div>
                  )}
                </div>
                <div className="grid gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g., Login Flow Test"
                      className="w-full px-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Description
                    </label>
                    <input
                      type="text"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="e.g., Verify user can log in with valid credentials"
                      className="w-full px-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Priority
                      </label>
                      <div className="relative">
                        <select
                          value={priority}
                          onChange={(e) => setPriority(e.target.value)}
                          className="w-full px-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none"
                        >
                          {PRIORITIES.map((p) => (
                            <option key={p.value} value={p.value}>
                              {p.label}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none text-muted-foreground" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Tags</label>
                      <input
                        type="text"
                        value={tags}
                        onChange={(e) => setTags(e.target.value)}
                        placeholder="e.g., auth, smoke, recorded"
                        className="w-full px-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Error */}
            {error && (
              <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
                {error}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: Live Step List */}
        <div className="w-96 border-l border-border flex flex-col bg-muted/30">
          <RecordedStepList
            steps={editableSteps}
            onStepsChange={setEditableSteps}
            isRecording={isRecording}
            isPaused={isPaused}
          />
        </div>
      </div>
    </div>
  );
}
