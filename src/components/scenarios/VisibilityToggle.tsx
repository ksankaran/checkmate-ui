"use client";

import { useState } from "react";
import { Lock, Unlock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { testCasesApi } from "@/lib/api/test-cases";
import { toast } from "sonner";
import type { TestCase, Visibility } from "@/types";

interface VisibilityToggleProps {
  testCase: TestCase;
  onVisibilityChange: (updated: TestCase) => void;
}

export function VisibilityToggle({
  testCase,
  onVisibilityChange,
}: VisibilityToggleProps) {
  const [loading, setLoading] = useState(false);
  const isPrivate = testCase.visibility === "private";

  async function handleToggle() {
    setLoading(true);
    const newVisibility: Visibility = isPrivate ? "public" : "private";
    try {
      const updated = await testCasesApi.updateVisibility(testCase.id, newVisibility);
      onVisibilityChange(updated);
      toast.success(`Feature is now ${newVisibility}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update visibility";
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
            variant="ghost"
            size="sm"
            onClick={handleToggle}
            disabled={loading}
            className="h-8 w-8 p-0"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isPrivate ? (
              <Lock className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Unlock className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {isPrivate ? "Private — only visible to you" : "Public — visible to all"}
          <br />
          <span className="text-xs text-muted-foreground">
            Fully functional when user authentication is enabled
          </span>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
