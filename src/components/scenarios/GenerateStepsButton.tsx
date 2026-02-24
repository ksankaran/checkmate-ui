"use client";

import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { API_URL } from "@/lib/api";
import { toast } from "sonner";
import type { TestCase } from "@/types";

interface GenerateStepsButtonProps {
  testCase: TestCase;
  projectId: number;
  onStepsGenerated: (updated: TestCase) => void;
  size?: "sm" | "default";
  variant?: "outline" | "default" | "secondary";
}

export function GenerateStepsButton({
  testCase,
  projectId,
  onStepsGenerated,
  size = "sm",
  variant = "outline",
}: GenerateStepsButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleGenerate() {
    if (!testCase.natural_query) {
      toast.error("Test case has no description to generate steps from");
      return;
    }

    setLoading(true);
    try {
      // Call the builder agent endpoint
      const res = await fetch(`${API_URL}/api/agent/projects/${projectId}/build`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: testCase.natural_query,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to generate steps");
      }

      // Read the SSE stream to get steps
      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let generatedSteps: unknown[] = [];
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
              const data = JSON.parse(line.slice(6));
              if (data.type === "steps_generated" && data.steps) {
                generatedSteps = data.steps;
              } else if (data.type === "test_case_created" && data.steps) {
                generatedSteps = data.steps;
              }
            } catch {
              // skip unparseable lines
            }
          }
        }
      }

      if (generatedSteps.length > 0) {
        // Save steps to the test case
        const updateRes = await fetch(`${API_URL}/api/test-cases/${testCase.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...testCase,
            steps: JSON.stringify(generatedSteps),
          }),
        });

        if (updateRes.ok) {
          const updated = await updateRes.json();
          onStepsGenerated(updated);
          toast.success(`Generated ${generatedSteps.length} steps`);
        } else {
          throw new Error("Failed to save generated steps");
        }
      } else {
        toast.error("No steps were generated. Try rephrasing the description.");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Generation failed";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={variant}
            size={size}
            onClick={handleGenerate}
            disabled={loading}
            className="gap-1.5"
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            {loading ? "Generating..." : "Generate Steps"}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          AI will generate executable test steps from the feature description
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
