"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  GripVertical,
  ChevronDown,
  Send,
  Loader2,
  MessageSquare,
  X,
  Play,
  CheckCircle,
  XCircle,
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
  isFixture?: boolean;
  fixtureName?: string;
}

interface UserMessage {
  id: string;
  content: string;
  timestamp: Date;
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
  fixture_name: string | null;
}

interface ExecutionResult {
  run_id: number;
  status: string;
  pass_count: number;
  error_count: number;
  steps: ExecutionStepResult[];
  summary: string;
}

interface Browser {
  id: string;
  name: string;
  headless: boolean;
}

interface Fixture {
  id: number;
  name: string;
  description: string | null;
  scope: string;
  has_valid_cache: boolean;
}

export default function EditTestCasePage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  const testCaseId = params.testCaseId as string;

  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [naturalQuery, setNaturalQuery] = useState("");
  const [priority, setPriority] = useState<"high" | "medium" | "low">("medium");
  const [tags, setTags] = useState("");
  const [steps, setSteps] = useState<TestStep[]>([]);
  const [originalSteps, setOriginalSteps] = useState<TestStep[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Chat state
  const [showChat, setShowChat] = useState(false);
  const [userMessages, setUserMessages] = useState<UserMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isLoadingChat, setIsLoadingChat] = useState(false);
  const [agentMessage, setAgentMessage] = useState<string | null>(null);

  // Execution state
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null);
  const [visibleStepIndex, setVisibleStepIndex] = useState<number>(-1);
  const [executionSteps, setExecutionSteps] = useState<TestStep[]>([]); // Combined fixture + test steps for display

  // Browser selection
  const [browsers, setBrowsers] = useState<Browser[]>([]);
  const [selectedBrowser, setSelectedBrowser] = useState<string | null>(null);

  // Fixtures
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [selectedFixtureIds, setSelectedFixtureIds] = useState<number[]>([]);

  const chatInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchTestCase();
    fetchBrowsers();
    fetchFixtures();
  }, [testCaseId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [userMessages, agentMessage]);

  async function fetchTestCase() {
    try {
      const res = await fetch(`${API_URL}/api/test-cases/${testCaseId}`);
      if (res.ok) {
        const data = await res.json();
        setName(data.name);
        setNaturalQuery(data.natural_query);
        setPriority(data.priority);

        // Parse tags
        const parsedTags = data.tags
          ? (Array.isArray(data.tags) ? data.tags : JSON.parse(data.tags))
          : [];
        setTags(parsedTags.join(", "));

        // Parse steps
        const parsedSteps = data.steps
          ? (Array.isArray(data.steps) ? data.steps : JSON.parse(data.steps))
          : [];
        const mappedSteps = parsedSteps.map((s: any) => ({
          id: crypto.randomUUID(),
          action: s.action || "click",
          target: s.target || "",
          value: s.value || "",
          description: s.description || "",
        }));
        setSteps(mappedSteps);
        setOriginalSteps(mappedSteps); // Store original steps for AI context

        // Parse fixture_ids
        const parsedFixtureIds = data.fixture_ids
          ? (Array.isArray(data.fixture_ids) ? data.fixture_ids : JSON.parse(data.fixture_ids))
          : [];
        setSelectedFixtureIds(parsedFixtureIds);
      }
    } catch (error) {
      console.error("Failed to fetch test case:", error);
      setError("Failed to load test case");
    } finally {
      setLoading(false);
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

  const toggleFixture = (fixtureId: number) => {
    setSelectedFixtureIds((prev) =>
      prev.includes(fixtureId)
        ? prev.filter((id) => id !== fixtureId)
        : [...prev, fixtureId]
    );
  };

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

  // Chat functions
  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isLoadingChat) return;

    const userMessage: UserMessage = {
      id: crypto.randomUUID(),
      content: chatInput.trim(),
      timestamp: new Date(),
    };

    const newMessages = [...userMessages, userMessage];
    setUserMessages(newMessages);
    setChatInput("");
    setIsLoadingChat(true);
    setAgentMessage(null);

    await invokeBuilder(userMessage.content, newMessages);

    setIsLoadingChat(false);
    chatInputRef.current?.focus();
  };

  const invokeBuilder = async (message: string, allMessages: UserMessage[]) => {
    try {
      const previousMessages = allMessages.slice(0, -1).map((m) => m.content);

      // Build current test case with original steps context
      const currentTestCase = {
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
        original_steps: originalSteps.map((s) => ({
          action: s.action,
          target: s.target || null,
          value: s.value || null,
          description: s.description,
        })),
      };

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
        if (data.test_case.name) setName(data.test_case.name);
        if (data.test_case.natural_query) setNaturalQuery(data.test_case.natural_query);
        if (data.test_case.priority) setPriority(data.test_case.priority);
        if (data.test_case.tags) setTags(data.test_case.tags.join(", "));
        if (data.test_case.steps) {
          setSteps(
            data.test_case.steps.map((s: any) => ({
              id: crypto.randomUUID(),
              action: s.action || "click",
              target: s.target || "",
              value: s.value || "",
              description: s.description || "",
            }))
          );
        }
      }

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

  // Execute current steps with SSE streaming
  const handleExecuteSteps = async () => {
    if (steps.length === 0 || isExecuting) return;

    setIsExecuting(true);
    setExecutionResult(null);
    setVisibleStepIndex(-1);
    setShowChat(true); // Show the panel to display results

    // Build combined execution steps list (fixture steps + test steps)
    let combinedSteps: TestStep[] = [];

    // Get fixture steps if any fixtures are selected
    if (selectedFixtureIds.length > 0) {
      const selectedFixtures = fixtures.filter((f) =>
        selectedFixtureIds.includes(f.id)
      );
      for (const fixture of selectedFixtures) {
        try {
          const res = await fetch(`${API_URL}/api/fixtures/${fixture.id}`);
          if (res.ok) {
            const fixtureData = await res.json();
            // setup_steps is a JSON string, parse it
            const fixtureSteps = typeof fixtureData.setup_steps === "string"
              ? JSON.parse(fixtureData.setup_steps)
              : fixtureData.setup_steps || [];
            combinedSteps.push(
              ...fixtureSteps.map((s: any) => ({
                id: crypto.randomUUID(),
                action: s.action || "unknown",
                target: s.target || "",
                value: s.value || "",
                description: s.description || `[${fixture.name}] ${s.action}`,
                isFixture: true,
                fixtureName: fixture.name,
              }))
            );
          }
        } catch (err) {
          console.error(`Failed to fetch fixture ${fixture.id}:`, err);
        }
      }
    }

    // Add test case steps
    combinedSteps.push(...steps.map((s) => ({ ...s, isFixture: false })));
    setExecutionSteps(combinedSteps);

    const stepResults: ExecutionStepResult[] = [];
    let runId: number | null = null;

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
          browser: selectedBrowser,
          fixture_ids: selectedFixtureIds.length > 0 ? selectedFixtureIds : null,
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

              switch (data.type) {
                case "run_started":
                  runId = data.run_id;
                  break;

                case "step_started":
                  setVisibleStepIndex(data.step_number - 1);
                  break;

                case "step_completed":
                  stepResults.push({
                    step_number: data.step_number,
                    action: data.action,
                    target: data.target || null,
                    value: data.value || null,
                    description: data.description,
                    status: data.status,
                    duration: data.duration,
                    error: data.error,
                    screenshot: data.screenshot || null,
                    fixture_name: data.fixture_name || null,
                  });
                  break;

                case "run_completed":
                  setExecutionResult({
                    run_id: data.run_id,
                    status: data.status,
                    pass_count: data.pass_count,
                    error_count: data.error_count,
                    steps: stepResults,
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
      setAgentMessage(
        `Error: Failed to execute steps. ${error instanceof Error ? error.message : ""}`
      );
    } finally {
      setIsExecuting(false);
      setVisibleStepIndex(-1);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
        `${API_URL}/api/test-cases/${testCaseId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(testCase),
        }
      );

      if (res.ok) {
        router.push(`/projects/${projectId}/test-cases/${testCaseId}`);
      } else {
        const data = await res.json();
        // Handle Pydantic validation errors (array of objects) or string error
        if (Array.isArray(data.detail)) {
          setError(data.detail.map((e: any) => e.msg || e.message || JSON.stringify(e)).join(", "));
        } else if (typeof data.detail === "string") {
          setError(data.detail);
        } else {
          setError("Failed to update test case");
        }
      }
    } catch (err) {
      setError("Failed to connect to server");
    } finally {
      setIsSaving(false);
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
      <header className="border-b border-border sticky top-0 bg-background z-10">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href={`/projects/${projectId}/test-cases/${testCaseId}`}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-lg font-semibold">Edit Test Case</h1>
          </div>
          <div className="flex items-center gap-2">
            {/* Browser selector */}
            {browsers.length > 0 && (
              <div className="relative">
                <select
                  value={selectedBrowser || ""}
                  onChange={(e) => setSelectedBrowser(e.target.value)}
                  disabled={isExecuting}
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
              type="button"
              onClick={handleExecuteSteps}
              disabled={isExecuting || steps.length === 0}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-50"
              title="Run current steps"
            >
              {isExecuting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              <span className="text-sm">{isExecuting ? "Running..." : "Run"}</span>
            </button>
            <button
              type="button"
              onClick={() => setShowChat(!showChat)}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg transition-colors",
                showChat
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted text-muted-foreground"
              )}
              title="AI Assistant"
            >
              <MessageSquare className="h-4 w-4" />
              <span className="text-sm">AI Edit</span>
            </button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main content with optional chat panel */}
      <div className="flex">
        {/* Form */}
        <main className={cn(
          "px-6 py-8 transition-all overflow-y-auto",
          showChat ? "w-[700px] shrink-0" : "flex-1 max-w-3xl mx-auto"
        )}>
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

          {/* Fixtures */}
          {fixtures.length > 0 && (
            <div className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-medium">Fixtures</h2>
                  <p className="text-sm text-muted-foreground">
                    Reusable setup sequences that run before the test.
                  </p>
                </div>
                <Link
                  href={`/projects/${projectId}/settings`}
                  className="text-sm text-primary hover:underline"
                >
                  Manage fixtures
                </Link>
              </div>
              <div className="space-y-2">
                {fixtures.map((fixture) => (
                  <label
                    key={fixture.id}
                    className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/30 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedFixtureIds.includes(fixture.id)}
                      onChange={() => toggleFixture(fixture.id)}
                      className="rounded border-border"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{fixture.name}</span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded ${
                            fixture.scope === "cached"
                              ? "bg-blue-500/20 text-blue-500"
                              : "bg-orange-500/20 text-orange-500"
                          }`}
                        >
                          {fixture.scope}
                        </span>
                        {fixture.scope === "cached" && fixture.has_valid_cache && (
                          <CheckCircle className="h-3 w-3 text-green-500" />
                        )}
                      </div>
                      {fixture.description && (
                        <p className="text-sm text-muted-foreground">
                          {fixture.description}
                        </p>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

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
              href={`/projects/${projectId}/test-cases/${testCaseId}`}
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
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
        </main>

        {/* Chat Panel */}
        {showChat && (
          <aside className="flex-1 border-l border-border bg-card flex flex-col h-[calc(100vh-65px)] sticky top-[65px]">
            {/* Chat Header */}
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h3 className="font-medium">AI Assistant</h3>
              <button
                type="button"
                onClick={() => setShowChat(false)}
                className="p-1 rounded hover:bg-muted transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Messages / Execution Results */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Execution in progress */}
              {isExecuting && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-primary font-medium">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Executing steps...</span>
                  </div>
                  {executionSteps.map((step, index) => {
                    const isVisible = index <= visibleStepIndex;
                    const isCurrent = index === visibleStepIndex;
                    return (
                      <div
                        key={step.id}
                        className={cn(
                          "flex items-start gap-3 p-3 rounded-lg transition-all",
                          isCurrent ? "bg-primary/10 border border-primary/20" :
                          isVisible ? "bg-muted" : "bg-muted/30 opacity-50"
                        )}
                      >
                        <div className="pt-0.5">
                          {isCurrent ? (
                            <Loader2 className="h-4 w-4 text-primary animate-spin" />
                          ) : isVisible ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">
                              {step.action}
                            </span>
                            {step.isFixture && step.fixtureName && (
                              <span className="text-xs px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-500">
                                {step.fixtureName}
                              </span>
                            )}
                          </div>
                          <p className="text-sm mt-1">{step.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Execution results */}
              {executionResult && !isExecuting && (
                <div className="space-y-3">
                  <div className={cn(
                    "flex items-center gap-2 font-medium",
                    executionResult.status === "passed" ? "text-green-500" : "text-red-500"
                  )}>
                    {executionResult.status === "passed" ? (
                      <CheckCircle className="h-5 w-5" />
                    ) : (
                      <XCircle className="h-5 w-5" />
                    )}
                    <span>
                      {executionResult.status === "passed" ? "All steps passed" : "Some steps failed"}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{executionResult.summary}</p>
                  {executionResult.steps.map((step) => (
                    <div
                      key={step.step_number}
                      className={cn(
                        "flex items-start gap-3 p-3 rounded-lg",
                        step.status === "failed" ? "bg-red-500/5" :
                        step.fixture_name ? "bg-blue-500/5 border-l-2 border-blue-500" : "bg-muted"
                      )}
                    >
                      <div className="pt-0.5">
                        {step.status === "passed" ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">
                            {step.action}
                          </span>
                          {step.fixture_name && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-500">
                              {step.fixture_name}
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {step.duration}ms
                          </span>
                        </div>
                        <p className="text-sm mt-1">{step.description}</p>
                        {step.error && (
                          <p className="text-sm text-red-500 mt-1">{step.error}</p>
                        )}
                        {step.screenshot && (
                          <div className="mt-2">
                            <p className="text-xs text-muted-foreground mb-1">
                              {step.action === "screenshot" ? "Captured screenshot:" : "Screenshot at failure:"}
                            </p>
                            <img
                              src={`data:image/png;base64,${step.screenshot}`}
                              alt={step.action === "screenshot" ? "Captured screenshot" : "Screenshot at failure"}
                              className="rounded border border-border max-w-full h-auto max-h-48 cursor-pointer hover:opacity-90"
                              onClick={() => {
                                const win = window.open("", "_blank");
                                if (win) {
                                  const img = win.document.createElement("img");
                                  img.src = `data:image/png;base64,${step.screenshot}`;
                                  img.style.maxWidth = "100%";
                                  win.document.body.appendChild(img);
                                }
                              }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setExecutionResult(null)}
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    Clear results
                  </button>
                </div>
              )}

              {/* Default state - no execution, show chat */}
              {!isExecuting && !executionResult && (
                <>
                  {userMessages.length === 0 && !agentMessage && (
                    <div className="text-center text-muted-foreground text-sm py-8">
                      <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>Ask the AI to modify this test case</p>
                      <p className="text-xs mt-1">e.g., "Add a step to check the error message"</p>
                    </div>
                  )}

                  {userMessages.map((msg) => (
                    <div key={msg.id} className="flex justify-end">
                      <div className="bg-primary text-primary-foreground rounded-lg px-3 py-2 max-w-[80%] text-sm">
                        {msg.content}
                      </div>
                    </div>
                  ))}

                  {isLoadingChat && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">Thinking...</span>
                    </div>
                  )}

                  {agentMessage && (
                    <div className="bg-muted rounded-lg px-3 py-2 text-sm">
                      {agentMessage}
                    </div>
                  )}
                </>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleChatSubmit} className="p-4 border-t border-border">
              <div className="flex gap-2">
                <input
                  ref={chatInputRef}
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask AI to modify test..."
                  className="flex-1 px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                  disabled={isLoadingChat}
                />
                <button
                  type="submit"
                  disabled={isLoadingChat || !chatInput.trim()}
                  className="p-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </form>
          </aside>
        )}
      </div>
    </div>
  );
}
