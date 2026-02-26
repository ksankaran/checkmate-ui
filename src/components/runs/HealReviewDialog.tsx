"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { HealSuggestion, HealedStep } from "@/types/healer";

// Minimal local type so the dialog doesn't need to import the full TestStep union
interface OriginalStep {
  action: string;
  target?: string | null;
  value?: string | null;
  description: string;
}

interface HealReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  suggestion: HealSuggestion | null;
  originalSteps: OriginalStep[];
  onApply: (healedSteps: HealedStep[]) => Promise<void>;
  isApplying: boolean;
}

const ACTION_LABELS: Record<string, string> = {
  navigate: "Navigate",
  click: "Click",
  type: "Type",
  fill_form: "Fill Form",
  select: "Select",
  hover: "Hover",
  press_key: "Press Key",
  wait: "Wait",
  wait_for_page: "Wait for Page",
  screenshot: "Screenshot",
  assert_text: "Assert Text",
  assert_element: "Assert Element",
  assert_style: "Assert Style",
  assert_url: "Assert URL",
  back: "Go Back",
  evaluate: "Evaluate JS",
  upload: "Upload",
  drag: "Drag & Drop",
};

function confidenceBadge(confidence: number) {
  if (confidence >= 0.8)
    return <Badge className="bg-green-500/20 text-green-600 dark:text-green-400 border-0">{Math.round(confidence * 100)}% — high</Badge>;
  if (confidence >= 0.5)
    return <Badge className="bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border-0">{Math.round(confidence * 100)}% — medium</Badge>;
  return <Badge className="bg-red-500/20 text-red-600 dark:text-red-400 border-0">{Math.round(confidence * 100)}% — low</Badge>;
}

function StepCell({
  step,
  stepNumber,
  isChanged,
  side,
}: {
  step: OriginalStep | HealedStep | null;
  stepNumber: number;
  isChanged: boolean;
  side: "before" | "after";
}) {
  if (!step) {
    return (
      <div className="flex-1 p-3 text-sm text-muted-foreground italic">
        (no step)
      </div>
    );
  }

  const borderClass = isChanged
    ? side === "before"
      ? "border-l-2 border-l-red-500"
      : "border-l-2 border-l-green-500"
    : "";

  const bgClass = isChanged
    ? side === "before"
      ? "bg-red-500/5"
      : "bg-green-500/5"
    : "bg-transparent";

  return (
    <div className={cn("flex-1 p-3 rounded text-sm", borderClass, bgClass)}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs text-muted-foreground w-5 shrink-0">{stepNumber}.</span>
        <span
          className={cn(
            "text-xs px-1.5 py-0.5 rounded font-medium",
            isChanged
              ? side === "before"
                ? "bg-red-500/20 text-red-600 dark:text-red-400"
                : "bg-green-500/20 text-green-600 dark:text-green-400"
              : "bg-primary/10 text-primary"
          )}
        >
          {ACTION_LABELS[step.action] || step.action}
        </span>
        {!isChanged && (
          <span className="text-xs text-muted-foreground">unchanged</span>
        )}
      </div>
      <p className={cn("text-sm ml-7", isChanged ? "" : "text-muted-foreground")}>
        {step.description}
      </p>
      {(step.target || step.value) && (
        <div className="ml-7 mt-1 text-xs font-mono text-muted-foreground space-y-0.5">
          {step.target && <div>target: {step.target}</div>}
          {step.value && <div>value: {step.value}</div>}
        </div>
      )}
      {"change_reason" in step && step.change_reason && (
        <p className="ml-7 mt-1.5 text-xs text-green-600 dark:text-green-400 italic">
          {step.change_reason}
        </p>
      )}
    </div>
  );
}

export function HealReviewDialog({
  open,
  onOpenChange,
  suggestion,
  originalSteps,
  onApply,
  isApplying,
}: HealReviewDialogProps) {
  if (!suggestion) return null;

  const changedSet = new Set(suggestion.changed_step_numbers);
  const maxLen = Math.max(originalSteps.length, suggestion.healed_steps.length);
  const rows = Array.from({ length: maxLen }, (_, i) => ({
    stepNumber: i + 1,
    original: originalSteps[i] ?? null,
    healed: suggestion.healed_steps[i] ?? null,
    isChanged: changedSet.has(i + 1),
  }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-primary" />
            <DialogTitle className="text-lg">AI Suggested Fix</DialogTitle>
            {confidenceBadge(suggestion.confidence)}
          </div>
          {suggestion.explanation && (
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
              {suggestion.explanation}
            </p>
          )}
        </DialogHeader>

        {/* Diff grid */}
        <div className="flex-1 overflow-y-auto mt-2">
          {/* Column headers */}
          <div className="grid grid-cols-2 gap-2 mb-2 px-1">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Before (Original)
            </div>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              After (Suggested Fix)
            </div>
          </div>

          <div className="space-y-1.5">
            {rows.map(({ stepNumber, original, healed, isChanged }) => (
              <div key={stepNumber} className="grid grid-cols-2 gap-2">
                <StepCell
                  step={original}
                  stepNumber={stepNumber}
                  isChanged={isChanged}
                  side="before"
                />
                <StepCell
                  step={healed}
                  stepNumber={stepNumber}
                  isChanged={isChanged}
                  side="after"
                />
              </div>
            ))}
          </div>
        </div>

        <DialogFooter className="pt-4 border-t border-border">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isApplying}
          >
            Dismiss
          </Button>
          <Button
            onClick={() => onApply(suggestion.healed_steps)}
            disabled={isApplying || suggestion.changed_step_numbers.length === 0}
          >
            {isApplying ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Applying…
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Apply Fix
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
