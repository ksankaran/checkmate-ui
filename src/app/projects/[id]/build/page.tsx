"use client";

import { useState, useRef, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Send,
  Plus,
  Trash2,
  Save,
  GripVertical,
  ChevronDown,
  Loader2,
  MessageSquare,
  FlaskConical,
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
  { value: "critical", label: "Critical" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

interface TestStep {
  id: string;
  action: string;
  target: string;
  value: string;
  description: string;
}

interface Project {
  id: number;
  name: string;
  description: string | null;
  base_url: string;
}

interface Fixture {
  id: number;
  name: string;
  description: string | null;
  scope: string;
  has_valid_cache: boolean;
}

interface UserMessage {
  id: string;
  content: string;
  timestamp: Date;
}

export default function BuildTestCasePage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  // Project state
  const [project, setProject] = useState<Project | null>(null);

  // Test case state
  const [name, setName] = useState("");
  const [naturalQuery, setNaturalQuery] = useState("");
  const [priority, setPriority] = useState<string>("medium");
  const [tags, setTags] = useState("");
  const [steps, setSteps] = useState<TestStep[]>([]);

  // Fixtures
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [selectedFixtureIds, setSelectedFixtureIds] = useState<number[]>([]);

  // Message state
  const [userMessages, setUserMessages] = useState<UserMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [agentMessage, setAgentMessage] = useState<string | null>(null);

  // Drag and drop state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Saving state
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchProject();
    fetchFixtures();
  }, [projectId]);

  async function fetchFixtures() {
    try {
      const res = await fetch(`${API_URL}/api/projects/${projectId}/fixtures`);
      if (res.ok) {
        const data = await res.json();
        setFixtures(data);
      }
    } catch (error) {
      console.error("Failed to fetch fixtures:", error);
    }
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [userMessages]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: UserMessage = {
      id: crypto.randomUUID(),
      content: input.trim(),
      timestamp: new Date(),
    };

    const newMessages = [...userMessages, userMessage];
    setUserMessages(newMessages);
    setInput("");
    setIsLoading(true);
    setAgentMessage(null);

    await invokeBuilder(userMessage.content, newMessages);

    setIsLoading(false);
    inputRef.current?.focus();
  };

  const invokeBuilder = async (message: string, allMessages: UserMessage[]) => {
    try {
      // Build request with previous messages (excluding current) and current test case state
      const previousMessages = allMessages.slice(0, -1).map((m) => m.content);

      const currentTestCase = steps.length > 0 || name || naturalQuery ? {
        name: name || undefined,
        natural_query: naturalQuery || undefined,
        priority,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        steps: steps.map((s) => ({
          action: s.action,
          target: s.target || null,
          value: s.value || null,
          description: s.description,
        })),
      } : undefined;

      const response = await fetch(
        `${API_URL}/api/agent/projects/${projectId}/build`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message,
            previous_messages: previousMessages,
            test_case: currentTestCase,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();

      // Update test case state from response
      if (data.test_case) {
        setName(data.test_case.name || "");
        setNaturalQuery(data.test_case.natural_query || "");
        setPriority(data.test_case.priority || "medium");
        setTags(data.test_case.tags?.join(", ") || "");
        setSteps(
          (data.test_case.steps || []).map((s: any) => ({
            id: crypto.randomUUID(),
            action: s.action || "click",
            target: s.target || "",
            value: s.value || "",
            description: s.description || "",
          }))
        );
        // Update selected fixtures from AI response
        if (data.test_case.fixture_ids && data.test_case.fixture_ids.length > 0) {
          setSelectedFixtureIds(data.test_case.fixture_ids);
        }
      }

      // Show agent message if any
      if (data.message) {
        setAgentMessage(data.message);
      }
    } catch (error) {
      console.error("Builder invocation failed:", error);
      setAgentMessage(
        `Error: Failed to communicate with the agent. ${error instanceof Error ? error.message : ""}`
      );
    }
  };

  const addStep = () => {
    setSteps([
      ...steps,
      { id: crypto.randomUUID(), action: "click", target: "", value: "", description: "" },
    ]);
  };

  const removeStep = (id: string) => {
    setSteps(steps.filter((s) => s.id !== id));
  };

  const updateStep = (id: string, field: keyof TestStep, value: string) => {
    setSteps(steps.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
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
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleSave = async () => {
    if (!name.trim() || steps.length === 0) {
      setError("Please provide a name and at least one step");
      return;
    }

    setError("");
    setIsSaving(true);

    try {
      const testCase = {
        project_id: parseInt(projectId),
        name,
        natural_query: naturalQuery,
        priority,
        tags: JSON.stringify(tags.split(",").map((t) => t.trim()).filter(Boolean)),
        steps: JSON.stringify(steps.map((s) => ({
          action: s.action,
          target: s.target || null,
          value: s.value || null,
          description: s.description,
        }))),
        fixture_ids: selectedFixtureIds.length > 0 ? JSON.stringify(selectedFixtureIds) : null,
      };

      const res = await fetch(
        `${API_URL}/api/test-cases`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(testCase),
        }
      );

      if (res.ok) {
        const saved = await res.json();
        router.push(`/projects/${projectId}/test-cases/${saved.id}`);
      } else {
        const data = await res.json();
        setError(data.detail || "Failed to save test case");
      }
    } catch (err) {
      setError("Failed to connect to server");
    } finally {
      setIsSaving(false);
    }
  };

  const suggestions = [
    "Test the login flow",
    "Verify navigation works",
    "Check form validation",
    "Test the logout button",
  ];

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
              <FlaskConical className="h-6 w-6 text-primary" />
              <div>
                <h1 className="text-lg font-semibold">Build Test Case</h1>
                <p className="text-xs text-muted-foreground">
                  {project?.name || "Loading..."}
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={isSaving || !name.trim() || steps.length === 0}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {isSaving ? "Saving..." : "Save Test Case"}
            </button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content - Split Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Middle: Test Case Builder */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-3xl mx-auto space-y-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Test Case Info
              </h2>
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
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <input
                    type="text"
                    value={naturalQuery}
                    onChange={(e) => setNaturalQuery(e.target.value)}
                    placeholder="e.g., Verify user can log in with valid credentials"
                    className="w-full px-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Priority</label>
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
                      placeholder="e.g., auth, smoke, critical"
                      className="w-full px-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Fixtures */}
            {fixtures.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    Fixtures {selectedFixtureIds.length > 0 && `(${selectedFixtureIds.length} selected)`}
                  </h2>
                  <Link
                    href={`/projects/${projectId}/settings`}
                    className="text-sm text-primary hover:underline"
                  >
                    Manage
                  </Link>
                </div>
                <div className="flex flex-wrap gap-2">
                  {fixtures.map((fixture) => {
                    const isSelected = selectedFixtureIds.includes(fixture.id);
                    return (
                      <button
                        key={fixture.id}
                        type="button"
                        onClick={() => {
                          setSelectedFixtureIds((prev) =>
                            isSelected
                              ? prev.filter((id) => id !== fixture.id)
                              : [...prev, fixture.id]
                          );
                        }}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-sm border transition-colors",
                          isSelected
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border hover:border-primary/50"
                        )}
                      >
                        {fixture.name}
                        {isSelected && " ✓"}
                      </button>
                    );
                  })}
                </div>
                {selectedFixtureIds.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Selected fixtures will run before test steps.
                  </p>
                )}
              </div>
            )}

            {/* Test Steps */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                  Test Steps {steps.length > 0 && `(${steps.length})`}
                </h2>
                <button
                  type="button"
                  onClick={addStep}
                  className="flex items-center gap-2 text-sm text-primary hover:text-primary/80"
                >
                  <Plus className="h-4 w-4" />
                  Add Step
                </button>
              </div>

              {steps.length === 0 ? (
                <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                  <p className="text-muted-foreground mb-4">
                    No steps yet. Describe what you want to test below, or add steps manually.
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {suggestions.map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => setInput(suggestion)}
                        className="px-3 py-1.5 text-sm rounded-full border border-border hover:border-primary/50 hover:bg-muted transition-colors"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {steps.map((step, index) => {
                    const config = getActionConfig(step.action);
                    const isDragging = draggedIndex === index;
                    const isDragOver = dragOverIndex === index;
                    return (
                      <div
                        key={step.id}
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
                            <span className="text-sm font-medium w-4">{index + 1}</span>
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
                                  Description
                                </label>
                                <input
                                  type="text"
                                  value={step.description}
                                  onChange={(e) => updateStep(step.id, "description", e.target.value)}
                                  placeholder="What this step does"
                                  className="w-full px-3 py-1.5 text-sm rounded border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
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
                            className="p-1.5 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Error */}
            {error && (
              <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
                {error}
              </div>
            )}
          </div>
        </div>

        {/* Right: Message Log */}
        <div className="w-80 border-l border-border flex flex-col bg-muted/30">
          <div className="p-4 border-b border-border">
            <div className="flex items-center gap-2 text-sm font-medium">
              <MessageSquare className="h-4 w-4" />
              Message History
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {userMessages.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Your messages will appear here
              </p>
            ) : (
              userMessages.map((msg) => (
                <div
                  key={msg.id}
                  className="p-3 rounded-lg bg-primary text-primary-foreground text-sm"
                >
                  {msg.content}
                </div>
              ))
            )}

            {/* Agent message (clarification/feedback) */}
            {agentMessage && (
              <div className="p-3 rounded-lg bg-card border border-border text-sm">
                {agentMessage}
              </div>
            )}

            {isLoading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Building test case...
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-border shrink-0">
        <div className="container mx-auto px-6 py-4">
          <form onSubmit={handleSubmit} className="flex gap-3 max-w-3xl mx-auto">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Describe what you want to test... (e.g., 'Test the login flow')"
              className="flex-1 px-4 py-3 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="px-4 py-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
