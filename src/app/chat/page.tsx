"use client";

import { useState, useRef, useEffect } from "react";
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
} from "lucide-react";
import { ThemeToggle } from "@/components/dashboard/ThemeToggle";
import { cn } from "@/lib/utils";

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

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [testSteps, setTestSteps] = useState<TestStep[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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

    // Simulate test execution (will be replaced with actual LangGraph integration)
    await simulateTestExecution(userMessage.content);

    setIsLoading(false);
  };

  const simulateTestExecution = async (query: string) => {
    // Simulate planning phase
    setTestSteps([
      { action: "navigate", description: "Navigate to login page", status: "pending" },
      { action: "type", description: "Enter email address", status: "pending" },
      { action: "type", description: "Enter password", status: "pending" },
      { action: "click", description: "Click login button", status: "pending" },
      { action: "assert", description: "Verify dashboard loads", status: "pending" },
    ]);

    // Simulate step-by-step execution
    for (let i = 0; i < 5; i++) {
      await new Promise((r) => setTimeout(r, 800));
      setTestSteps((prev) =>
        prev.map((step, idx) =>
          idx === i
            ? { ...step, status: "running" }
            : idx < i
            ? { ...step, status: "passed" }
            : step
        )
      );
    }

    // Final step
    await new Promise((r) => setTimeout(r, 500));
    setTestSteps((prev) =>
      prev.map((step) => ({ ...step, status: "passed" }))
    );

    // Add assistant response
    const assistantMessage: Message = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: `**Test Results: PASSED**

I tested the login functionality and all 5 steps completed successfully:

1. Navigated to /login
2. Entered test email
3. Entered test password
4. Clicked login button
5. Verified dashboard loaded correctly

The login feature is working as expected. The test took approximately 4 seconds to complete.`,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, assistantMessage]);
    setTestSteps([]);
  };

  const suggestions = [
    "Is login working fine?",
    "Test the checkout flow",
    "Generate test cases for user registration",
    "Check if the search feature works",
  ];

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border shrink-0">
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
              <h1 className="text-lg font-semibold">Checkmate Chat</h1>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="container mx-auto max-w-3xl px-6 py-6">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-12">
              <img src="/checkmate-icon.png" alt="Checkmate" className="h-16 w-16 mb-6" />
              <h2 className="text-2xl font-bold mb-2">Checkmate</h2>
              <p className="text-muted-foreground text-center mb-8 max-w-md">
                Ask me to test your application using natural language. I can run
                tests, generate test cases, and report results.
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
                        {message.content}
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
                    <h4 className="font-medium mb-3">Test Progress</h4>
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
              placeholder="Ask me to test something..."
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
