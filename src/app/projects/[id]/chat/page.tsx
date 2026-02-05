"use client";

import React, { useState, useRef, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Send,
  Plus,
  Trash2,
  GripVertical,
  ChevronDown,
  Loader2,
  Play,
  MessageSquare,
  CheckCircle,
  XCircle,
  Circle,
  ExternalLink,
  RotateCcw,
  Image,
  X,
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
  { value: "assert_url", label: "Assert URL", hasTarget: false, hasValue: true, valueHint: "Regex pattern" },
  { value: "back", label: "Go Back", hasTarget: false, hasValue: false },
  { value: "evaluate", label: "Evaluate JS", hasTarget: false, hasValue: true, valueHint: "JavaScript code" },
  { value: "upload", label: "Upload File", hasTarget: false, hasValue: true, valueHint: "File path" },
  { value: "drag", label: "Drag & Drop", hasTarget: true, hasValue: true, targetHint: "Start element", valueHint: "End element" },
];

interface TestStep {
  id: string;
  action: string;
  target: string;
  value: string;
  description: string;
  status?: "pending" | "running" | "passed" | "failed";
  screenshot?: string; // Base64 PNG
  error?: string;
}

interface Project {
  id: number;
  name: string;
  description: string | null;
  base_url: string;
}

interface UserMessage {
  id: string;
  content: string;
  timestamp: Date;
}

export default function ProjectChatPage() {
  const params = useParams();
  const projectId = params.id as string;

  // Project state
  const [project, setProject] = useState<Project | null>(null);

  // Test steps state
  const [steps, setSteps] = useState<TestStep[]>([]);

  // Message state
  const [userMessages, setUserMessages] = useState<UserMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [agentMessage, setAgentMessage] = useState<string | null>(null);
  const [threadId, setThreadId] = useState<string | null>(null);

  // Drag and drop state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Screenshot modal state
  const [selectedScreenshot, setSelectedScreenshot] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchProject();
  }, [projectId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [userMessages, agentMessage]);

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
    if (!input.trim() || isLoading || isRunning) return;

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

    await invokeAgent(userMessage.content, newMessages);

    setIsLoading(false);
    inputRef.current?.focus();
  };

  const invokeAgent = async (message: string, allMessages: UserMessage[]) => {
    try {
      // Build request with previous messages and current steps
      const previousMessages = allMessages.slice(0, -1).map((m) => m.content);

      const currentTestCase = steps.length > 0 ? {
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

      // Store thread_id for conversation continuity
      if (data.thread_id) {
        setThreadId(data.thread_id);
      }

      // Update steps from response
      if (data.test_case?.steps) {
        setSteps(
          data.test_case.steps.map((s: any) => ({
            id: crypto.randomUUID(),
            action: s.action || "click",
            target: s.target || "",
            value: s.value || "",
            description: s.description || "",
            status: undefined,
          }))
        );
      }

      // Show agent message if any
      if (data.message) {
        setAgentMessage(data.message);
      }
    } catch (error) {
      console.error("Agent invocation failed:", error);
      setAgentMessage(
        `Error: Failed to communicate with the agent. ${error instanceof Error ? error.message : ""}`
      );
    }
  };

  const addStep = (atIndex?: number) => {
    const newStep = { id: crypto.randomUUID(), action: "click", target: "", value: "", description: "" };
    if (atIndex !== undefined) {
      const newSteps = [...steps];
      newSteps.splice(atIndex + 1, 0, newStep);
      setSteps(newSteps);
    } else {
      setSteps([...steps, newStep]);
    }
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

  const handleRun = async () => {
    if (steps.length === 0 || isRunning) return;

    setIsRunning(true);
    setAgentMessage(null);

    // Reset step statuses
    setSteps(steps.map(s => ({ ...s, status: "pending" as const })));

    try {
      // Call the backend execute/stream endpoint
      const response = await fetch(`${API_URL}/api/test-runs/execute/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: parseInt(projectId),
          steps: steps.map(s => ({
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

      // Read SSE stream
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
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const event = JSON.parse(line.slice(6));

              if (event.type === "step_started") {
                const stepNum = event.step_number;
                setSteps(prev => prev.map((s, idx) =>
                  idx === stepNum - 1 ? { ...s, status: "running" as const } : s
                ));
              } else if (event.type === "step_completed") {
                const stepNum = event.step_number;
                const status = event.status === "passed" ? "passed" : "failed";
                setSteps(prev => prev.map((s, idx) =>
                  idx === stepNum - 1 ? {
                    ...s,
                    status: status as "passed" | "failed",
                    screenshot: event.screenshot || undefined,
                    error: event.error || undefined,
                  } : s
                ));
              } else if (event.type === "run_completed") {
                setAgentMessage(event.summary);
              } else if (event.type === "warning") {
                setAgentMessage(event.message);
              } else if (event.type === "error") {
                setAgentMessage(`Error: ${event.message}`);
              }
            } catch {
              // Ignore parse errors
            }
          }
        }
      }
    } catch (error) {
      console.error("Execution failed:", error);
      setAgentMessage(`Error: ${error instanceof Error ? error.message : "Execution failed"}`);
      // Reset steps to no status on error
      setSteps(prev => prev.map(s => ({ ...s, status: undefined })));
    } finally {
      setIsRunning(false);
    }
  };

  const handleReset = () => {
    setSteps([]);
    setUserMessages([]);
    setAgentMessage(null);
    setThreadId(null);
  };

  const suggestions = [
    "Test the login flow",
    "Check if forms validate correctly",
    "Test the navigation menu",
    "Verify logout works",
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
              <img src="/checkmate-icon.png" alt="Checkmate" className="h-6 w-6" />
              <div>
                <h1 className="text-lg font-semibold">Test {project?.name || "..."}</h1>
                <p className="text-xs text-muted-foreground font-mono">
                  {project?.base_url}
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {steps.length > 0 && (
              <>
                <button
                  onClick={handleReset}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border hover:bg-muted transition-colors text-sm"
                  title="Clear and start over"
                >
                  <RotateCcw className="h-4 w-4" />
                  Reset
                </button>
                <button
                  onClick={handleRun}
                  disabled={isRunning || steps.length === 0}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {isRunning ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                  {isRunning ? "Running..." : "Run Test"}
                </button>
              </>
            )}
            {project && project.base_url && /^https?:\/\//i.test(project.base_url) && (
              <a
                href={project.base_url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg hover:bg-muted transition-colors"
                title="Open application"
              >
                <ExternalLink className="h-5 w-5" />
              </a>
            )}
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content - Split Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Test Steps */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-3xl mx-auto">
            {steps.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <img src="/checkmate-icon.png" alt="Checkmate" className="h-16 w-16 mb-6 opacity-50" />
                <h2 className="text-xl font-semibold mb-2">
                  What would you like to test?
                </h2>
                <p className="text-muted-foreground text-center mb-6 max-w-md">
                  Describe what you want to test in natural language. I'll generate the steps, and you can modify them before running.
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {suggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => setInput(suggestion)}
                      className="px-4 py-2 text-sm rounded-full border border-border hover:border-primary/50 hover:bg-muted transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    Test Steps ({steps.length})
                  </h2>
                  <button
                    type="button"
                    onClick={() => addStep()}
                    disabled={isRunning}
                    className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 disabled:opacity-50"
                  >
                    <Plus className="h-4 w-4" />
                    Add Step
                  </button>
                </div>

                <div className="space-y-3">
                  {steps.map((step, index) => {
                    const config = getActionConfig(step.action);
                    const isDragging = draggedIndex === index;
                    const isDragOver = dragOverIndex === index;
                    return (
                      <div key={step.id}>
                        <div
                          draggable={!isRunning}
                          onDragStart={() => handleDragStart(index)}
                          onDragOver={(e) => handleDragOver(e, index)}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDrop(e, index)}
                          onDragEnd={handleDragEnd}
                          className={cn(
                            "p-4 rounded-lg border bg-card transition-all",
                            isDragging && "opacity-50 border-primary",
                            isDragOver && "border-primary border-2 border-dashed",
                            step.status === "running" && "border-primary bg-primary/5",
                            step.status === "passed" && "border-green-500/50 bg-green-500/5",
                            step.status === "failed" && "border-red-500/50 bg-red-500/5",
                            !isDragging && !isDragOver && !step.status && "border-border"
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className={cn(
                                "flex items-center gap-2 pt-2",
                                !isRunning && "cursor-grab active:cursor-grabbing text-muted-foreground"
                              )}
                              title={!isRunning ? "Drag to reorder" : undefined}
                            >
                              {step.status === "passed" ? (
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              ) : step.status === "failed" ? (
                                <XCircle className="h-4 w-4 text-red-500" />
                              ) : step.status === "running" ? (
                                <Loader2 className="h-4 w-4 text-primary animate-spin" />
                              ) : (
                                <GripVertical className="h-4 w-4" />
                              )}
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
                                      disabled={isRunning}
                                      className="w-full px-3 py-1.5 text-sm rounded border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none disabled:opacity-50"
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
                                    disabled={isRunning}
                                    className="w-full px-3 py-1.5 text-sm rounded border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
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
                                      disabled={isRunning}
                                      className="w-full px-3 py-1.5 text-sm rounded border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
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
                                      disabled={isRunning}
                                      className="w-full px-3 py-1.5 text-sm rounded border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
                                    />
                                  </div>
                                )}
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => removeStep(step.id)}
                              disabled={isRunning}
                              className="p-1.5 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors disabled:opacity-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>

                          {/* Error message */}
                          {step.error && (
                            <div className="mt-3 p-2 rounded bg-red-500/10 text-red-500 text-sm">
                              {step.error}
                            </div>
                          )}

                          {/* Screenshot thumbnail */}
                          {step.screenshot && (
                            <div className="mt-3">
                              <button
                                onClick={() => setSelectedScreenshot(step.screenshot!)}
                                className="flex items-center gap-2 p-2 rounded border border-border hover:border-primary/50 transition-colors"
                              >
                                <Image className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">View Screenshot</span>
                              </button>
                            </div>
                          )}
                        </div>
                        {/* Insert step button between steps */}
                        {!isRunning && (
                          <div className="flex justify-center py-1">
                            <button
                              onClick={() => addStep(index)}
                              className="p-1 rounded-full hover:bg-muted text-muted-foreground hover:text-primary transition-colors opacity-0 hover:opacity-100"
                              title="Insert step here"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Message Log */}
        <div className="w-80 border-l border-border flex flex-col bg-muted/30">
          <div className="p-4 border-b border-border">
            <div className="flex items-center gap-2 text-sm font-medium">
              <MessageSquare className="h-4 w-4" />
              Conversation
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {userMessages.length === 0 && !agentMessage ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Describe what you want to test below
              </p>
            ) : (
              <>
                {userMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className="p-3 rounded-lg bg-primary text-primary-foreground text-sm"
                  >
                    {msg.content}
                  </div>
                ))}

                {/* Agent message */}
                {agentMessage && (
                  <div className="p-3 rounded-lg bg-card border border-border text-sm">
                    {agentMessage}
                  </div>
                )}
              </>
            )}

            {isLoading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating steps...
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
              placeholder={steps.length > 0 ? "Add more steps or modify the test..." : "Describe what you want to test..."}
              className="flex-1 px-4 py-3 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
              disabled={isLoading || isRunning}
            />
            <button
              type="submit"
              disabled={isLoading || isRunning || !input.trim()}
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

      {/* Screenshot Modal */}
      {selectedScreenshot && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setSelectedScreenshot(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] overflow-auto">
            <button
              onClick={() => setSelectedScreenshot(null)}
              className="absolute top-2 right-2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
            <img
              src={`data:image/png;base64,${selectedScreenshot}`}
              alt="Screenshot"
              className="rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
}
