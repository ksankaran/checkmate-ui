"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  GripVertical,
  ChevronDown,
} from "lucide-react";
import { ThemeToggle } from "@/components/dashboard/ThemeToggle";
import { cn } from "@/lib/utils";
import { API_URL } from "@/lib/api";

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
  { value: "back", label: "Go Back", hasTarget: false, hasValue: false },
  { value: "evaluate", label: "Evaluate JS", hasTarget: false, hasValue: true, valueHint: "JavaScript code" },
  { value: "upload", label: "Upload File", hasTarget: false, hasValue: true, valueHint: "File path" },
  { value: "drag", label: "Drag & Drop", hasTarget: true, hasValue: true, targetHint: "Start element", valueHint: "End element" },
];

const PRIORITIES = [
  { value: "high", label: "High", color: "text-red-500" },
  { value: "medium", label: "Medium", color: "text-yellow-500" },
  { value: "low", label: "Low", color: "text-green-500" },
];

interface TestStep {
  id: string;
  action: string;
  target: string;
  value: string;
  description: string;
}

export default function NewTestCasePage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [name, setName] = useState("");
  const [naturalQuery, setNaturalQuery] = useState("");
  const [priority, setPriority] = useState<"high" | "medium" | "low">("medium");
  const [tags, setTags] = useState("");
  const [steps, setSteps] = useState<TestStep[]>([
    { id: crypto.randomUUID(), action: "navigate", target: "", value: "", description: "" },
  ]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const addStep = () => {
    setSteps([
      ...steps,
      { id: crypto.randomUUID(), action: "click", target: "", value: "", description: "" },
    ]);
  };

  const insertStepAt = (index: number) => {
    const newStep = { id: crypto.randomUUID(), action: "click", target: "", value: "", description: "" };
    const newSteps = [...steps];
    newSteps.splice(index, 0, newStep);
    setSteps(newSteps);
  };

  const removeStep = (id: string) => {
    if (steps.length > 1) {
      setSteps(steps.filter((s) => s.id !== id));
    }
  };

  const updateStep = (id: string, field: keyof TestStep, value: string) => {
    setSteps(steps.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
  };

  const getActionConfig = (action: string) => {
    return VALID_ACTIONS.find((a) => a.value === action) || VALID_ACTIONS[0];
  };

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
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSaving(true);

    try {
      const testCase = {
        name,
        natural_query: naturalQuery,
        priority,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        steps: steps.map((s) => ({
          action: s.action,
          target: s.target || null,
          value: s.value || null,
          description: s.description,
        })),
      };

      const res = await fetch(
        `${API_URL}/api/test-cases/project/${projectId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(testCase),
        }
      );

      if (res.ok) {
        router.push(`/projects/${projectId}`);
      } else {
        const data = await res.json();
        setError(data.detail || "Failed to create test case");
      }
    } catch (err) {
      setError("Failed to connect to server");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border sticky top-0 bg-background z-10">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href={`/projects/${projectId}`}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-lg font-semibold">New Test Case</h1>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* Form */}
      <main className="container mx-auto max-w-3xl px-6 py-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Info */}
          <div className="space-y-4">
            <h2 className="text-lg font-medium">Basic Information</h2>
            <div className="grid gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Test Case Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Login Flow"
                  className="w-full px-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Natural Language Query *
                </label>
                <input
                  type="text"
                  value={naturalQuery}
                  onChange={(e) => setNaturalQuery(e.target.value)}
                  placeholder="e.g., Verify user can log in with valid credentials"
                  className="w-full px-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Priority</label>
                  <div className="relative">
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as "high" | "medium" | "low")}
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
                  <label className="block text-sm font-medium mb-1">
                    Tags (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="e.g., auth, smoke, critical"
                    className="w-full px-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Test Steps */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium">Test Steps</h2>
              <button
                type="button"
                onClick={addStep}
                className="flex items-center gap-2 text-sm text-primary hover:text-primary/80"
              >
                <Plus className="h-4 w-4" />
                Add Step
              </button>
            </div>

            <div className="space-y-1">
              {steps.map((step, index) => {
                const config = getActionConfig(step.action);
                const isDragging = draggedIndex === index;
                const isDragOver = dragOverIndex === index;
                return (
                  <div key={step.id}>
                    {/* Insert button before first step */}
                    {index === 0 && (
                      <div className="flex justify-center py-1">
                        <button
                          type="button"
                          onClick={() => insertStepAt(0)}
                          className="group flex items-center gap-1 px-2 py-0.5 text-xs text-muted-foreground hover:text-primary transition-colors"
                          title="Insert step here"
                        >
                          <div className="h-px w-8 bg-border group-hover:bg-primary/50 transition-colors" />
                          <Plus className="h-3 w-3" />
                          <div className="h-px w-8 bg-border group-hover:bg-primary/50 transition-colors" />
                        </button>
                      </div>
                    )}
                    <div
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, index)}
                    onDragEnd={handleDragEnd}
                    className={cn(
                      "p-4 rounded-lg border bg-card transition-all",
                      isDragging && "opacity-50 border-primary",
                      isDragOver && "border-primary border-2 border-dashed",
                      !isDragging && !isDragOver && "border-border"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="flex items-center gap-2 text-muted-foreground pt-2 cursor-grab active:cursor-grabbing"
                        title="Drag to reorder"
                      >
                        <GripVertical className="h-4 w-4" />
                        <span className="text-sm font-medium">{index + 1}</span>
                      </div>

                      <div className="flex-1 grid gap-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs text-muted-foreground mb-1">
                              Action
                            </label>
                            <div className="relative">
                              <select
                                value={step.action}
                                onChange={(e) => updateStep(step.id, "action", e.target.value)}
                                className="w-full px-3 py-1.5 text-sm rounded border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none"
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
                              className="w-full px-3 py-1.5 text-sm rounded border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                              required
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
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
                                className="w-full px-3 py-1.5 text-sm rounded border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
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
                                className="w-full px-3 py-1.5 text-sm rounded border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                              />
                            </div>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeStep(step.id)}
                        className={cn(
                          "p-1.5 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors",
                          steps.length === 1 && "opacity-50 pointer-events-none"
                        )}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    </div>
                    {/* Insert button after each step */}
                    <div className="flex justify-center py-1">
                      <button
                        type="button"
                        onClick={() => insertStepAt(index + 1)}
                        className="group flex items-center gap-1 px-2 py-0.5 text-xs text-muted-foreground hover:text-primary transition-colors"
                        title="Insert step here"
                      >
                        <div className="h-px w-8 bg-border group-hover:bg-primary/50 transition-colors" />
                        <Plus className="h-3 w-3" />
                        <div className="h-px w-8 bg-border group-hover:bg-primary/50 transition-colors" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <Link
              href={`/projects/${projectId}`}
              className="px-4 py-2 rounded-lg border border-border hover:bg-muted transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {isSaving ? "Saving..." : "Save Test Case"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
