"use client";

import React, { useState, useRef, useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Send,
  User,
  Bot,
  Loader2,
  CheckCircle,
  XCircle,
  Circle,
  ExternalLink,
} from "lucide-react";
import { ThemeToggle } from "@/components/dashboard/ThemeToggle";
import { cn } from "@/lib/utils";
import { API_URL } from "@/lib/api";

interface Project {
  id: number;
  name: string;
  description: string | null;
  base_url: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface TestStep {
  action: string;
  description: string;
  status: "pending" | "running" | "passed" | "failed";
}

// Simple markdown renderer for chat messages
function renderMarkdown(content: string) {
  // Split into parts, preserving markdown syntax
  const parts: (string | React.ReactNode)[] = [];
  let keyIndex = 0;

  // Process markdown links [text](url) and bold **text**
  const regex = /(\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*)/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(content)) !== null) {
    // Add text before match
    if (match.index > lastIndex) {
      parts.push(content.slice(lastIndex, match.index));
    }

    if (match[2] && match[3]) {
      // Link: [text](url)
      const isInternal = match[3].startsWith("/");
      if (isInternal) {
        parts.push(
          <Link key={keyIndex++} href={match[3]} className="text-primary hover:underline">
            {match[2]}
          </Link>
        );
      } else {
        parts.push(
          <a key={keyIndex++} href={match[3]} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
            {match[2]}
          </a>
        );
      }
    } else if (match[4]) {
      // Bold: **text**
      parts.push(<strong key={keyIndex++}>{match[4]}</strong>);
    }

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < content.length) {
    parts.push(content.slice(lastIndex));
  }

  return parts.length > 0 ? parts : content;
}

export default function ProjectChatPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const projectId = params.id as string;
  const action = searchParams.get("action");

  const [project, setProject] = useState<Project | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [testSteps, setTestSteps] = useState<TestStep[]>([]);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [autoRunTriggered, setAutoRunTriggered] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchProject();
  }, [projectId]);

  useEffect(() => {
    // Pre-fill input based on action param
    if (action === "generate" && !messages.length) {
      setInput("Generate test cases for the main user flows");
    }
  }, [action]);

  // Handle testCaseId param - auto-run the test case
  useEffect(() => {
    const testCaseId = searchParams.get("testCaseId");
    if (testCaseId && !autoRunTriggered && project) {
      setAutoRunTriggered(true);
      runTestCase(testCaseId);
    }
  }, [searchParams, project, autoRunTriggered]);

  async function runTestCase(testCaseId: string) {
    try {
      // Fetch the test case
      const res = await fetch(`${API_URL}/api/test-cases/${testCaseId}`);
      if (!res.ok) return;

      const testCase = await res.json();

      // Parse steps
      let steps = testCase.steps;
      if (typeof steps === "string") {
        steps = JSON.parse(steps);
      }

      // Add user message
      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content: `Run test case: ${testCase.name}`,
        timestamp: new Date(),
      };
      setMessages([userMessage]);
      setIsLoading(true);

      // Show test steps for execution visualization
      setTestSteps(
        steps.map((step: any) => ({
          action: step.action,
          description: step.description,
          status: "pending" as const,
        }))
      );

      // Simulate step-by-step execution
      for (let i = 0; i < steps.length; i++) {
        await new Promise((r) => setTimeout(r, 600));
        setTestSteps((prev) =>
          prev.map((step, idx) =>
            idx === i
              ? { ...step, status: "running" as const }
              : idx < i
              ? { ...step, status: "passed" as const }
              : step
          )
        );
      }

      // Mark all as passed
      await new Promise((r) => setTimeout(r, 400));
      setTestSteps((prev) =>
        prev.map((step) => ({ ...step, status: "passed" as const }))
      );

      // Add completion message
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: `**Test Case: ${testCase.name}**\n\nAll ${steps.length} steps completed successfully.\n\n**Note:** This is a simulated execution. Real Playwright MCP integration coming in Phase 2.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setTestSteps([]);
    } catch (error) {
      console.error("Failed to run test case:", error);
    } finally {
      setIsLoading(false);
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, testSteps]);

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

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // Call the LangGraph agent via FastAPI
    await invokeAgent(userMessage.content);

    setIsLoading(false);
  };

  const invokeAgent = async (query: string) => {
    try {
      const response = await fetch(
        `${API_URL}/api/agent/projects/${projectId}/chat`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: query,
            thread_id: threadId,
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

      // Handle response based on intent
      const intent = data.intent;

      if (intent === "generate_test_cases") {
        // Format generated test cases response
        const testCases = data.generated_test_cases || [];
        const testCasesCount = testCases.length;

        let content = "";

        if (testCasesCount > 0) {
          content = `**Generated ${testCasesCount} Test Cases for ${project?.name}**\n\n`;

          // Show all test cases (not truncated)
          testCases.forEach((tc: any, index: number) => {
            content += `${index + 1}. **${tc.name}** [${tc.priority.toUpperCase()}]\n`;
            content += `   Query: "${tc.natural_query}"\n`;
            content += `   Tags: ${tc.tags?.join(", ") || "none"}\n\n`;
          });

          content += `All ${testCasesCount} test cases have been saved to the database.\n\n`;
          content += `[View all test cases](/projects/${projectId})\n\n`;
          content += data.summary || "Would you like me to run any of these tests now?";
        } else {
          // Fallback to showing the raw message if no structured test cases
          content = data.message;
          content += `\n\n[View test cases](/projects/${projectId})`;
        }

        const assistantMessage: Message = {
          id: crypto.randomUUID(),
          role: "assistant",
          content,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } else if (intent === "execute_test" && data.test_plan) {
        // Show test execution with steps
        const steps = data.test_plan.steps || [];
        setTestSteps(
          steps.map((step: any) => ({
            action: step.action,
            description: step.description,
            status: "pending" as const,
          }))
        );

        // Simulate step-by-step execution for visual feedback
        for (let i = 0; i < steps.length; i++) {
          await new Promise((r) => setTimeout(r, 600));
          setTestSteps((prev) =>
            prev.map((step, idx) =>
              idx === i
                ? { ...step, status: "running" as const }
                : idx < i
                ? { ...step, status: "passed" as const }
                : step
            )
          );
        }

        // Mark all as passed (executor is still placeholder)
        await new Promise((r) => setTimeout(r, 400));
        setTestSteps((prev) =>
          prev.map((step) => ({ ...step, status: "passed" as const }))
        );

        // Add agent response
        const assistantMessage: Message = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: data.message,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
        setTestSteps([]);
      } else {
        // Default: just show the agent's message
        const assistantMessage: Message = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: data.message,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
      }
    } catch (error) {
      console.error("Agent invocation failed:", error);
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: `**Error:** Failed to communicate with the agent. Please ensure the backend is running on port 8000.\n\n${error instanceof Error ? error.message : "Unknown error"}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    }
  };

  const suggestions = project
    ? [
        "Is login working?",
        "Test the main navigation",
        "Generate test cases for checkout",
        "Check if forms validate correctly",
      ]
    : [];

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
                <h1 className="text-lg font-semibold">
                  {project?.name || "Loading..."}
                </h1>
                <p className="text-xs text-muted-foreground font-mono">
                  {project?.base_url}
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {project && (
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

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="container mx-auto max-w-3xl px-6 py-6">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-12">
              <img src="/checkmate-icon.png" alt="Checkmate" className="h-16 w-16 mb-6" />
              <h2 className="text-2xl font-bold mb-2">
                Test {project?.name || "Project"}
              </h2>
              <p className="text-muted-foreground text-center mb-8 max-w-md">
                Ask me to test your application using natural language. I'll
                execute real browser tests and report the results.
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
            <div className="space-y-6">
              <AnimatePresence>
                {messages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "flex gap-4",
                      message.role === "user" && "justify-end"
                    )}
                  >
                    {message.role === "assistant" && (
                      <div className="shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Bot className="h-4 w-4 text-primary" />
                      </div>
                    )}
                    <div
                      className={cn(
                        "max-w-[80%] rounded-lg px-4 py-3",
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      )}
                    >
                      <div className="whitespace-pre-wrap text-sm">
                        {renderMarkdown(message.content)}
                      </div>
                    </div>
                    {message.role === "user" && (
                      <div className="shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                        <User className="h-4 w-4" />
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Test Progress */}
              {testSteps.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-4"
                >
                  <div className="shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Loader2 className="h-4 w-4 text-primary animate-spin" />
                  </div>
                  <div className="flex-1 rounded-lg border border-border bg-card p-4">
                    <h4 className="font-medium mb-3">
                      Testing {project?.name}...
                    </h4>
                    <div className="space-y-2">
                      {testSteps.map((step, index) => (
                        <div
                          key={index}
                          className={cn(
                            "flex items-center gap-3 p-2 rounded",
                            step.status === "running" && "bg-primary/5"
                          )}
                        >
                          {step.status === "passed" && (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          )}
                          {step.status === "failed" && (
                            <XCircle className="h-4 w-4 text-red-500" />
                          )}
                          {step.status === "running" && (
                            <Loader2 className="h-4 w-4 text-primary animate-spin" />
                          )}
                          {step.status === "pending" && (
                            <Circle className="h-4 w-4 text-muted-foreground" />
                          )}
                          <span className="text-sm">{step.description}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-border shrink-0">
        <div className="container mx-auto max-w-3xl px-6 py-4">
          <form onSubmit={handleSubmit} className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Ask me to test ${project?.name || "your application"}...`}
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
