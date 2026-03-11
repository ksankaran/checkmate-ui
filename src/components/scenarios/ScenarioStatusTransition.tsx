"use client";

import { useState } from "react";
import { ChevronDown, Loader2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ScenarioStatusBadge } from "./ScenarioStatusBadge";
import { testCasesApi } from "@/lib/api/test-cases";
import type { TestCaseStatus, TestCase } from "@/types";
import { toast } from "sonner";

interface ScenarioStatusTransitionProps {
  testCase: TestCase;
  onStatusChange: (updated: TestCase) => void;
}

const transitions: Record<string, { label: string; value: TestCaseStatus }[]> = {
  draft: [
    { label: "Mark as Ready", value: "ready" },
    { label: "Skip", value: "skipped" },
    { label: "Archive", value: "archived" },
  ],
  active: [
    { label: "Mark as Ready", value: "ready" },
    { label: "Revert to Draft", value: "draft" },
    { label: "Skip", value: "skipped" },
    { label: "Archive", value: "archived" },
  ],
  ready: [
    { label: "Submit for Review", value: "in_review" },
    { label: "Revert to Draft", value: "draft" },
    { label: "Skip", value: "skipped" },
    { label: "Archive", value: "archived" },
  ],
  in_review: [
    { label: "Approve", value: "approved" },
    { label: "Send Back to Draft", value: "draft" },
    { label: "Skip", value: "skipped" },
    { label: "Archive", value: "archived" },
  ],
  approved: [
    { label: "Revert to Draft", value: "draft" },
    { label: "Re-submit for Review", value: "in_review" },
    { label: "Skip", value: "skipped" },
    { label: "Archive", value: "archived" },
  ],
  skipped: [
    { label: "Revert to Draft", value: "draft" },
    { label: "Archive", value: "archived" },
  ],
  archived: [],
};

export function ScenarioStatusTransition({
  testCase,
  onStatusChange,
}: ScenarioStatusTransitionProps) {
  const [loading, setLoading] = useState(false);
  const availableTransitions = transitions[testCase.status] || [];

  if (availableTransitions.length === 0) {
    return <ScenarioStatusBadge status={testCase.status as TestCaseStatus} />;
  }

  async function handleTransition(newStatus: TestCaseStatus) {
    setLoading(true);
    try {
      const updated = await testCasesApi.updateStatus(testCase.id, newStatus);
      onStatusChange(updated);
      const statusLabels: Record<string, string> = { in_review: "In Review", skipped: "Skipped" };
      toast.success(`Status updated to ${statusLabels[newStatus] || newStatus}`);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to update status";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1 h-auto p-0" disabled={loading} data-testid={`status-trigger-${testCase.id}`}>
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <>
              <ScenarioStatusBadge status={testCase.status as TestCaseStatus} />
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {availableTransitions.map((t) => (
          <DropdownMenuItem key={t.value} onClick={() => handleTransition(t.value)}>
            {t.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
