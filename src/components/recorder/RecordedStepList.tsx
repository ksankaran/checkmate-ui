"use client";

import { useState } from "react";
import { Plus, KeyRound } from "lucide-react";
import { ACTION_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { StepEditor } from "./StepEditor";

interface EditableStep {
  id: string;
  action: string;
  target: string;
  value: string;
  description: string;
  is_credential: boolean;
}

interface RecordedStepListProps {
  steps: EditableStep[];
  onStepsChange: (steps: EditableStep[]) => void;
  isRecording: boolean;
  isPaused: boolean;
}

export function RecordedStepList({
  steps,
  onStepsChange,
  isRecording,
  isPaused,
}: RecordedStepListProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const updateStep = (id: string, field: keyof EditableStep, value: string) => {
    onStepsChange(steps.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
  };

  const removeStep = (id: string) => {
    onStepsChange(steps.filter((s) => s.id !== id));
  };

  const addStep = () => {
    onStepsChange([
      ...steps,
      {
        id: crypto.randomUUID(),
        action: "click",
        target: "",
        value: "",
        description: "",
        is_credential: false,
      },
    ]);
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
    onStepsChange(newSteps);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const credentialSteps = steps.filter((s) => s.is_credential);

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium">
            Recorded Steps {steps.length > 0 && `(${steps.length})`}
          </h3>
          {isPaused && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
              Paused
            </span>
          )}
        </div>
        {(!isRecording || isPaused) && (
          <button
            onClick={addStep}
            className="flex items-center gap-1 text-xs text-primary hover:text-primary/80"
          >
            <Plus className="h-3 w-3" />
            Add Step
          </button>
        )}
      </div>

      {isPaused && steps.length > 0 && (
        <div className="px-3 py-2 bg-amber-50/60 dark:bg-amber-950/20 border-b border-amber-200/50 dark:border-amber-800/30 text-xs text-amber-700 dark:text-amber-400">
          Recording paused — edit, reorder, or add steps freely.
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {steps.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">
              {isRecording
                ? "Interact with the browser window — steps appear here live"
                : "Click Record to start capturing steps"}
            </p>
          </div>
        ) : (
          <>
            {steps.map((step, index) => (
              <StepEditor
                key={step.id}
                step={step}
                index={index}
                onUpdate={updateStep}
                onRemove={removeStep}
                isDragging={draggedIndex === index}
                isDragOver={dragOverIndex === index}
                onDragStart={() => setDraggedIndex(index)}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (draggedIndex !== null && draggedIndex !== index) {
                    setDragOverIndex(index);
                  }
                }}
                onDragLeave={() => setDragOverIndex(null)}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={() => {
                  setDraggedIndex(null);
                  setDragOverIndex(null);
                }}
              />
            ))}
          </>
        )}
      </div>

      {/* Credential detection banner */}
      {credentialSteps.length > 0 && !isRecording && (
        <div className="p-3 border-t border-yellow-500/20 bg-yellow-500/5">
          <div className="flex items-center gap-2 text-xs">
            <KeyRound className="h-3.5 w-3.5 text-yellow-500" />
            <span className="text-yellow-600 dark:text-yellow-400 font-medium">
              {credentialSteps.length} credential{credentialSteps.length !== 1 ? "s" : ""} detected
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1 ml-5">
            Password fields are replaced with placeholders. Save to Vault after creating the test case.
          </p>
        </div>
      )}
    </div>
  );
}
