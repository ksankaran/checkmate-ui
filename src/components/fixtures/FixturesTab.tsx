"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Edit2,
  Trash2,
  Play,
  RefreshCw,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  X,
  Wand2,
  GripVertical,
  ChevronDown,
  Square,
} from "lucide-react";
import { API_URL } from "@/lib/api";
import { cn } from "@/lib/utils";

const VALID_ACTIONS = [
  { value: "navigate", label: "Navigate", hasTarget: false, hasValue: true, valueHint: "URL path (e.g., /login)" },
  { value: "click", label: "Click", hasTarget: true, hasValue: false, targetHint: "Element description" },
  { value: "type", label: "Type", hasTarget: true, hasValue: true, targetHint: "Input field", valueHint: "Text to type" },
  { value: "fill_form", label: "Fill Form", hasTarget: false, hasValue: true, valueHint: 'JSON: {"field": "value"}' },
  { value: "select", label: "Select", hasTarget: true, hasValue: true, targetHint: "Dropdown element", valueHint: "Option to select" },
  { value: "hover", label: "Hover", hasTarget: true, hasValue: false, targetHint: "Element to hover" },
  { value: "press_key", label: "Press Key", hasTarget: false, hasValue: true, valueHint: "Key name (Enter, Tab)" },
  { value: "wait", label: "Wait", hasTarget: true, hasValue: true, targetHint: "Element/text (optional)", valueHint: "Time in ms (optional)" },
  { value: "wait_for_page", label: "Wait for Page", hasTarget: false, hasValue: true, valueHint: "load, domcontentloaded, or networkidle" },
  { value: "screenshot", label: "Screenshot", hasTarget: false, hasValue: true, valueHint: "Filename (optional)" },
  { value: "assert_text", label: "Assert Text", hasTarget: false, hasValue: true, valueHint: "Expected text" },
  { value: "assert_element", label: "Assert Element", hasTarget: true, hasValue: false, targetHint: "Element description" },
  { value: "assert_style", label: "Assert Style", hasTarget: true, hasValue: true, targetHint: "Element", valueHint: '{"property": "color", "expected": "red"}' },
  { value: "assert_url", label: "Assert URL", hasTarget: false, hasValue: true, valueHint: "Regex pattern" },
  { value: "back", label: "Go Back", hasTarget: false, hasValue: false },
  { value: "evaluate", label: "Evaluate JS", hasTarget: false, hasValue: true, valueHint: "JavaScript code" },
  { value: "upload", label: "Upload File", hasTarget: false, hasValue: true, valueHint: "File path" },
  { value: "drag", label: "Drag & Drop", hasTarget: true, hasValue: true, targetHint: "Start element", valueHint: "End element" },
];

interface Fixture {
  id: number;
  name: string;
  description: string | null;
  setup_steps: string;
  scope: string;
  cache_ttl_seconds: number;
  project_id: number;
  created_at: string;
  updated_at: string;
  has_valid_cache: boolean;
  cache_expires_at: string | null;
}

interface FixtureStep {
  id: string;
  action: string;
  target: string;
  value: string;
  description: string;
}

interface ExecutionStepResult {
  step_number: number;
  action: string;
  target: string | null;
  value: string | null;
  description: string;
  status: string;
  duration: number | null;
  error: string | null;
  screenshot: string | null;
}

interface ExecutionResult {
  status: string;
  pass_count: number;
  error_count: number;
  steps: ExecutionStepResult[];
  summary: string;
}

interface FixturesTabProps {
  projectId: string;
}

export function FixturesTab({ projectId }: FixturesTabProps) {
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit" | "generate">("create");
  const [editingFixture, setEditingFixture] = useState<Fixture | null>(null);
  const [saving, setSaving] = useState(false);
  const [previewing, setPreviewing] = useState<number | null>(null);
  const [clearingCache, setClearingCache] = useState<number | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [scope, setScope] = useState("test");
  const [cacheTtl, setCacheTtl] = useState(3600);
  const [steps, setSteps] = useState<FixtureStep[]>([]);

  // Generate mode
  const [generatePrompt, setGeneratePrompt] = useState("");
  const [generating, setGenerating] = useState(false);

  // Drag and drop
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Execution state
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(-1);
  const [stepResults, setStepResults] = useState<ExecutionStepResult[]>([]);
  const resultsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchFixtures();
  }, [projectId]);

  // Scroll only when a step fails (to show error/screenshot) or execution completes
  useEffect(() => {
    if (stepResults.length > 0) {
      const lastResult = stepResults[stepResults.length - 1];
      // Only scroll on failure to show the error
      if (lastResult.status === "failed") {
        resultsEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }
    }
  }, [stepResults]);

  // Scroll to summary when execution completes
  useEffect(() => {
    if (executionResult) {
      resultsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [executionResult]);

  async function fetchFixtures() {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/projects/${projectId}/fixtures`);
      if (res.ok) {
        const data = await res.json();
        setFixtures(data);
      }
    } catch (error) {
      console.error("Failed to fetch fixtures:", error);
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setName("");
    setDescription("");
    setScope("test");
    setCacheTtl(3600);
    setSteps([{ id: crypto.randomUUID(), action: "navigate", target: "", value: "", description: "" }]);
    setGeneratePrompt("");
    // Reset execution state
    setIsExecuting(false);
    setExecutionResult(null);
    setCurrentStepIndex(-1);
    setStepResults([]);
  }

  function openCreateModal() {
    setModalMode("create");
    setEditingFixture(null);
    resetForm();
    setShowModal(true);
  }

  function openEditModal(fixture: Fixture) {
    setModalMode("edit");
    setEditingFixture(fixture);
    setName(fixture.name);
    setDescription(fixture.description || "");
    setScope(fixture.scope);
    setCacheTtl(fixture.cache_ttl_seconds);

    // Parse steps from JSON
    try {
      const parsedSteps = JSON.parse(fixture.setup_steps);
      setSteps(
        parsedSteps.map((s: any) => ({
          id: crypto.randomUUID(),
          action: s.action || "click",
          target: s.target || "",
          value: s.value || "",
          description: s.description || "",
        }))
      );
    } catch {
      setSteps([{ id: crypto.randomUUID(), action: "click", target: "", value: "", description: "" }]);
    }

    setShowModal(true);
  }

  function openGenerateModal() {
    setModalMode("generate");
    setEditingFixture(null);
    resetForm();
    setShowModal(true);
  }

  // Clear execution results helper
  const clearExecutionResults = () => {
    if (executionResult) {
      setExecutionResult(null);
      setStepResults([]);
    }
  };

  // Step management
  const addStep = () => {
    setSteps([
      ...steps,
      { id: crypto.randomUUID(), action: "click", target: "", value: "", description: "" },
    ]);
    clearExecutionResults();
  };

  const insertStepAt = (index: number) => {
    const newStep = { id: crypto.randomUUID(), action: "click", target: "", value: "", description: "" };
    const newSteps = [...steps];
    newSteps.splice(index, 0, newStep);
    setSteps(newSteps);
    clearExecutionResults();
  };

  const removeStep = (id: string) => {
    if (steps.length > 1) {
      setSteps(steps.filter((s) => s.id !== id));
      clearExecutionResults();
    }
  };

  const updateStep = (id: string, field: keyof FixtureStep, value: string) => {
    setSteps(steps.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
    clearExecutionResults();
  };

  const getActionConfig = (action: string) => {
    return VALID_ACTIONS.find((a) => a.value === action) || VALID_ACTIONS[0];
  };

  // Drag and drop handlers
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const newSteps = [...steps];
    const [draggedStep] = newSteps.splice(draggedIndex, 1);
    newSteps.splice(dropIndex, 0, draggedStep);
    setSteps(newSteps);
    setDraggedIndex(null);
    setDragOverIndex(null);
    clearExecutionResults();
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  async function handleSaveFixture() {
    if (!name.trim()) {
      alert("Name is required");
      return;
    }

    if (steps.length === 0) {
      alert("At least one setup step is required");
      return;
    }

    // Validate all steps have descriptions
    const invalidSteps = steps.filter((s) => !s.description.trim());
    if (invalidSteps.length > 0) {
      alert("All steps must have a description");
      return;
    }

    setSaving(true);
    try {
      const url = editingFixture
        ? `${API_URL}/api/fixtures/${editingFixture.id}`
        : `${API_URL}/api/projects/${projectId}/fixtures`;

      const res = await fetch(url, {
        method: editingFixture ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description: description || null,
          setup_steps: steps.map((s) => ({
            action: s.action,
            target: s.target || null,
            value: s.value || null,
            description: s.description,
          })),
          scope,
          cache_ttl_seconds: cacheTtl,
        }),
      });

      if (res.ok) {
        setShowModal(false);
        fetchFixtures();
      } else {
        const err = await res.json();
        alert(err.detail || "Failed to save fixture");
      }
    } catch (error) {
      console.error("Failed to save fixture:", error);
      alert("Failed to save fixture");
    } finally {
      setSaving(false);
    }
  }

  async function handleGenerateFixture() {
    if (!generatePrompt.trim()) {
      alert("Please enter a description of the setup sequence");
      return;
    }

    setGenerating(true);
    try {
      const res = await fetch(
        `${API_URL}/api/projects/${projectId}/fixtures/generate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: generatePrompt,
            name: name || null,
          }),
        }
      );

      if (res.ok) {
        setShowModal(false);
        fetchFixtures();
      } else {
        const err = await res.json();
        alert(err.detail || "Failed to generate fixture");
      }
    } catch (error) {
      console.error("Failed to generate fixture:", error);
      alert("Failed to generate fixture");
    } finally {
      setGenerating(false);
    }
  }

  async function handleDeleteFixture(fixture: Fixture) {
    if (!confirm(`Delete fixture "${fixture.name}"?`)) {
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/fixtures/${fixture.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        fetchFixtures();
      } else {
        const err = await res.json();
        alert(err.detail || "Failed to delete fixture");
      }
    } catch (error) {
      console.error("Failed to delete fixture:", error);
      alert("Failed to delete fixture");
    }
  }

  async function handlePreviewFixture(fixture: Fixture) {
    setPreviewing(fixture.id);
    try {
      const res = await fetch(`${API_URL}/api/fixtures/${fixture.id}/preview`, {
        method: "POST",
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.detail || "Failed to preview fixture");
        return;
      }

      // Read SSE stream
      const reader = res.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const event = JSON.parse(line.slice(6));
              if (event.type === "completed") {
                if (event.status === "passed") {
                  alert("Fixture preview completed successfully!");
                } else {
                  alert(`Fixture preview failed: ${event.summary}`);
                }
              }
            } catch {
              // Ignore parse errors
            }
          }
        }
      }
    } catch (error) {
      console.error("Failed to preview fixture:", error);
      alert("Failed to preview fixture");
    } finally {
      setPreviewing(null);
    }
  }

  async function handleClearCache(fixture: Fixture) {
    setClearingCache(fixture.id);
    try {
      const res = await fetch(`${API_URL}/api/fixtures/${fixture.id}/state`, {
        method: "DELETE",
      });

      if (res.ok) {
        fetchFixtures();
      } else {
        const err = await res.json();
        alert(err.detail || "Failed to clear cache");
      }
    } catch (error) {
      console.error("Failed to clear cache:", error);
      alert("Failed to clear cache");
    } finally {
      setClearingCache(null);
    }
  }

  // Execute current steps in the modal
  async function handleExecuteSteps() {
    if (steps.length === 0 || isExecuting) return;

    // Validate steps have descriptions
    const invalidSteps = steps.filter((s) => !s.description.trim());
    if (invalidSteps.length > 0) {
      alert("All steps must have a description before running");
      return;
    }

    setIsExecuting(true);
    setExecutionResult(null);
    setCurrentStepIndex(-1);
    setStepResults([]);

    const results: ExecutionStepResult[] = [];

    try {
      const response = await fetch(`${API_URL}/api/test-runs/execute/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: parseInt(projectId),
          steps: steps.map((s) => ({
            action: s.action,
            target: s.target || null,
            value: s.value || null,
            description: s.description,
          })),
        }),
      });

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

        const messages = buffer.split("\n\n");
        buffer = messages.pop() || "";

        for (const message of messages) {
          const lines = message.split("\n");
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));

                switch (data.type) {
                  case "step_started":
                    setCurrentStepIndex(data.step_number - 1);
                    break;

                  case "step_completed":
                    const stepResult: ExecutionStepResult = {
                      step_number: data.step_number,
                      action: data.action,
                      target: data.target || null,
                      value: data.value || null,
                      description: data.description,
                      status: data.status,
                      duration: data.duration,
                      error: data.error,
                      screenshot: data.screenshot || null,
                    };
                    results.push(stepResult);
                    setStepResults([...results]);
                    break;

                  case "run_completed":
                    setExecutionResult({
                      status: data.status,
                      pass_count: data.pass_count,
                      error_count: data.error_count,
                      steps: results,
                      summary: data.summary,
                    });
                    break;

                  case "error":
                    throw new Error(data.message);
                }
              } catch (parseError) {
                console.error("SSE parse error:", parseError);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error("Execution failed:", error);
      setExecutionResult({
        status: "failed",
        pass_count: 0,
        error_count: 1,
        steps: results,
        summary: `Execution failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
    } finally {
      setIsExecuting(false);
      setCurrentStepIndex(-1);
    }
  }

  function formatTTL(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.round(seconds / 3600)}h`;
    return `${Math.round(seconds / 86400)}d`;
  }

  function getStepsCount(stepsJson: string): number {
    try {
      const steps = JSON.parse(stepsJson);
      return Array.isArray(steps) ? steps.length : 0;
    } catch {
      return 0;
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <motion.div
      key="fixtures"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold">Fixtures</h2>
          <p className="text-sm text-muted-foreground">
            Reusable setup sequences that run before test steps (e.g., login)
            execution.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={openGenerateModal}
            className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
          >
            <Wand2 className="h-4 w-4" />
            Generate
          </button>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Fixture
          </button>
        </div>
      </div>

      {fixtures.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No fixtures yet.</p>
          <p className="text-sm">
            Create a fixture to reuse login or other setup steps across tests.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {fixtures.map((fixture) => (
            <div
              key={fixture.id}
              className="border border-border rounded-lg p-4 hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{fixture.name}</h3>
                  </div>
                  {fixture.description && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {fixture.description}
                    </p>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                    <span>{getStepsCount(fixture.setup_steps)} steps</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePreviewFixture(fixture)}
                    disabled={previewing === fixture.id}
                    className="p-2 rounded hover:bg-muted transition-colors disabled:opacity-50"
                    title="Run setup"
                  >
                    {previewing === fixture.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </button>
                  <button
                    onClick={() => openEditModal(fixture)}
                    className="p-2 rounded hover:bg-muted transition-colors"
                    title="Edit"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteFixture(fixture)}
                    className="p-2 rounded hover:bg-muted hover:text-red-500 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card border border-border rounded-lg p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">
                  {modalMode === "generate"
                    ? "Generate Fixture"
                    : modalMode === "create"
                    ? "Add Fixture"
                    : "Edit Fixture"}
                </h3>
                <div className="flex items-center gap-2">
                  {modalMode !== "generate" && (
                    <button
                      type="button"
                      onClick={handleExecuteSteps}
                      disabled={isExecuting || steps.length === 0}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-50 text-sm"
                      title="Run steps"
                    >
                      {isExecuting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                      {isExecuting ? "Running..." : "Run"}
                    </button>
                  )}
                  <button
                    onClick={() => setShowModal(false)}
                    className="p-2 rounded hover:bg-muted transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {modalMode === "generate" ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Name (optional)
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g., admin_login"
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Describe the setup sequence{" "}
                      <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={generatePrompt}
                      onChange={(e) => setGeneratePrompt(e.target.value)}
                      rows={4}
                      placeholder="e.g., Login as admin user using the admin persona, then navigate to the dashboard and wait for it to load"
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Basic Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g., admin_login"
                        className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
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
                        placeholder="e.g., Login as admin user"
                        className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </div>

                  {/* Setup Steps */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium">
                        Setup Steps <span className="text-red-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={addStep}
                        className="flex items-center gap-1 text-sm text-primary hover:text-primary/80"
                      >
                        <Plus className="h-4 w-4" />
                        Add Step
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">
                      Use {`{{persona.username}}`} and {`{{persona.password}}`} to reference personas.
                    </p>

                    <div className="space-y-1 max-h-[400px] overflow-y-auto">
                      {steps.map((step, index) => {
                        const config = getActionConfig(step.action);
                        const isDragging = draggedIndex === index;
                        const isDragOver = dragOverIndex === index;

                        // Execution status for this step
                        const stepResult = stepResults.find((r) => r.step_number === index + 1);
                        const isCurrentStep = currentStepIndex === index;
                        const isPassed = stepResult?.status === "passed";
                        const isFailed = stepResult?.status === "failed";

                        return (
                          <div key={step.id}>
                            {/* Insert button before first step */}
                            {index === 0 && !isExecuting && !executionResult && (
                              <div className="flex justify-center py-1">
                                <button
                                  type="button"
                                  onClick={() => insertStepAt(0)}
                                  className="group flex items-center gap-1 px-2 py-0.5 text-xs text-muted-foreground hover:text-primary transition-colors"
                                  title="Insert step here"
                                >
                                  <div className="h-px w-6 bg-border group-hover:bg-primary/50 transition-colors" />
                                  <Plus className="h-3 w-3" />
                                  <div className="h-px w-6 bg-border group-hover:bg-primary/50 transition-colors" />
                                </button>
                              </div>
                            )}

                            <div
                              draggable={!isExecuting && !executionResult}
                              onDragStart={() => handleDragStart(index)}
                              onDragOver={(e) => handleDragOver(e, index)}
                              onDragLeave={handleDragLeave}
                              onDrop={(e) => handleDrop(e, index)}
                              onDragEnd={handleDragEnd}
                              className={cn(
                                "p-3 rounded-lg border bg-background transition-all",
                                isDragging && "opacity-50 border-primary",
                                isDragOver && "border-primary border-2 border-dashed",
                                isCurrentStep && "border-primary bg-primary/5",
                                isPassed && "border-green-500/50 bg-green-500/5",
                                isFailed && "border-red-500/50 bg-red-500/5",
                                !isDragging && !isDragOver && !isCurrentStep && !isPassed && !isFailed && "border-border"
                              )}
                            >
                              <div className="flex items-start gap-2">
                                <div
                                  className={cn(
                                    "flex items-center gap-1 pt-1.5",
                                    !isExecuting && !executionResult && "cursor-grab active:cursor-grabbing text-muted-foreground",
                                    (isExecuting || executionResult) && "cursor-default"
                                  )}
                                  title={!isExecuting && !executionResult ? "Drag to reorder" : undefined}
                                >
                                  {isCurrentStep ? (
                                    <Loader2 className="h-4 w-4 text-primary animate-spin" />
                                  ) : isPassed ? (
                                    <CheckCircle className="h-4 w-4 text-green-500" />
                                  ) : isFailed ? (
                                    <XCircle className="h-4 w-4 text-red-500" />
                                  ) : (
                                    <GripVertical className="h-4 w-4" />
                                  )}
                                  <span className="text-xs font-medium w-4">{index + 1}</span>
                                </div>

                                <div className="flex-1 grid gap-2">
                                  <div className="grid grid-cols-2 gap-2">
                                    <div>
                                      <label className="block text-xs text-muted-foreground mb-1">
                                        Action
                                      </label>
                                      <div className="relative">
                                        <select
                                          value={step.action}
                                          onChange={(e) => updateStep(step.id, "action", e.target.value)}
                                          className="w-full px-2 py-1 text-sm rounded border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none"
                                        >
                                          {VALID_ACTIONS.map((a) => (
                                            <option key={a.value} value={a.value}>
                                              {a.label}
                                            </option>
                                          ))}
                                        </select>
                                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 pointer-events-none text-muted-foreground" />
                                      </div>
                                    </div>
                                    <div>
                                      <label className="block text-xs text-muted-foreground mb-1">
                                        Description *
                                      </label>
                                      <input
                                        type="text"
                                        value={step.description}
                                        onChange={(e) => updateStep(step.id, "description", e.target.value)}
                                        placeholder="What this step does"
                                        className="w-full px-2 py-1 text-sm rounded border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                                      />
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-2 gap-2">
                                    {config.hasTarget && (
                                      <div>
                                        <label className="block text-xs text-muted-foreground mb-1">
                                          Target
                                        </label>
                                        <input
                                          type="text"
                                          value={step.target}
                                          onChange={(e) => updateStep(step.id, "target", e.target.value)}
                                          placeholder={config.targetHint || "Element"}
                                          className="w-full px-2 py-1 text-sm rounded border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                                        />
                                      </div>
                                    )}
                                    {config.hasValue && (
                                      <div className={cn(!config.hasTarget && "col-span-2")}>
                                        <label className="block text-xs text-muted-foreground mb-1">
                                          Value
                                        </label>
                                        <input
                                          type="text"
                                          value={step.value}
                                          onChange={(e) => updateStep(step.id, "value", e.target.value)}
                                          placeholder={config.valueHint || "Value"}
                                          className="w-full px-2 py-1 text-sm rounded border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                                        />
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {!isExecuting && !executionResult && (
                                  <button
                                    type="button"
                                    onClick={() => removeStep(step.id)}
                                    className={cn(
                                      "p-1 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors",
                                      steps.length === 1 && "opacity-50 pointer-events-none"
                                    )}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                )}

                                {/* Show duration for completed steps */}
                                {stepResult && (
                                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                                    {stepResult.duration}ms
                                  </span>
                                )}
                              </div>

                              {/* Error message */}
                              {stepResult?.error && (
                                <div className="mt-2 ml-9 p-2 rounded bg-red-500/10 text-red-500 text-sm">
                                  {stepResult.error}
                                </div>
                              )}

                              {/* Screenshot on failure */}
                              {stepResult?.screenshot && (
                                <div className="mt-2 ml-9">
                                  <p className="text-xs text-muted-foreground mb-1">Screenshot at failure:</p>
                                  <img
                                    src={`data:image/png;base64,${stepResult.screenshot}`}
                                    alt="Screenshot at failure"
                                    className="rounded border border-border max-w-full h-auto max-h-32 cursor-pointer hover:opacity-90"
                                    onClick={() => {
                                      const win = window.open("", "_blank");
                                      if (win) {
                                        const img = win.document.createElement("img");
                                        img.src = `data:image/png;base64,${stepResult.screenshot}`;
                                        img.style.maxWidth = "100%";
                                        win.document.body.appendChild(img);
                                      }
                                    }}
                                  />
                                </div>
                              )}
                            </div>

                            {/* Insert button after each step */}
                            {!isExecuting && !executionResult && (
                              <div className="flex justify-center py-1">
                                <button
                                  type="button"
                                  onClick={() => insertStepAt(index + 1)}
                                  className="group flex items-center gap-1 px-2 py-0.5 text-xs text-muted-foreground hover:text-primary transition-colors"
                                  title="Insert step here"
                                >
                                  <div className="h-px w-6 bg-border group-hover:bg-primary/50 transition-colors" />
                                  <Plus className="h-3 w-3" />
                                  <div className="h-px w-6 bg-border group-hover:bg-primary/50 transition-colors" />
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                      <div ref={resultsEndRef} />
                    </div>

                    {/* Execution Summary */}
                    {executionResult && (
                      <div className={cn(
                        "mt-4 p-3 rounded-lg border",
                        executionResult.status === "passed"
                          ? "border-green-500/50 bg-green-500/10"
                          : "border-red-500/50 bg-red-500/10"
                      )}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {executionResult.status === "passed" ? (
                              <CheckCircle className="h-5 w-5 text-green-500" />
                            ) : (
                              <XCircle className="h-5 w-5 text-red-500" />
                            )}
                            <span className={cn(
                              "font-medium",
                              executionResult.status === "passed" ? "text-green-500" : "text-red-500"
                            )}>
                              {executionResult.status === "passed" ? "All steps passed" : "Some steps failed"}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              ({executionResult.pass_count} passed, {executionResult.error_count} failed)
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setExecutionResult(null);
                              setStepResults([]);
                            }}
                            className="text-sm text-muted-foreground hover:text-foreground"
                          >
                            Clear results
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-lg border border-border hover:bg-muted transition-colors"
                  disabled={saving || generating}
                >
                  Cancel
                </button>
                <button
                  onClick={
                    modalMode === "generate"
                      ? handleGenerateFixture
                      : handleSaveFixture
                  }
                  disabled={saving || generating}
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {(saving || generating) && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  {modalMode === "generate"
                    ? generating
                      ? "Generating..."
                      : "Generate"
                    : saving
                    ? "Saving..."
                    : modalMode === "create"
                    ? "Create"
                    : "Save"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
