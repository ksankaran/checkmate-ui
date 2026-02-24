"use client";

import { Trash2, GripVertical, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { VALID_ACTIONS } from "@/lib/constants";

interface EditableStep {
  id: string;
  action: string;
  target: string;
  value: string;
  description: string;
  is_credential: boolean;
}

interface StepEditorProps {
  step: EditableStep;
  index: number;
  onUpdate: (id: string, field: keyof EditableStep, value: string) => void;
  onRemove: (id: string) => void;
  isDragging?: boolean;
  isDragOver?: boolean;
  onDragStart?: () => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDragLeave?: () => void;
  onDrop?: (e: React.DragEvent) => void;
  onDragEnd?: () => void;
}

export function StepEditor({
  step,
  index,
  onUpdate,
  onRemove,
  isDragging,
  isDragOver,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
}: StepEditorProps) {
  const config = VALID_ACTIONS.find((a) => a.value === step.action) || VALID_ACTIONS[0];

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      className={cn(
        "p-3 rounded-lg border bg-card transition-all",
        isDragging && "opacity-50 border-primary",
        isDragOver && "border-primary border-2 border-dashed",
        !isDragging && !isDragOver && "border-border",
        step.is_credential && "border-yellow-500/30 bg-yellow-500/5"
      )}
    >
      <div className="flex items-start gap-2">
        <div
          className="flex items-center gap-1.5 text-muted-foreground pt-1.5 cursor-grab active:cursor-grabbing shrink-0"
          title="Drag to reorder"
        >
          <GripVertical className="h-3.5 w-3.5" />
          <span className="text-xs font-medium w-3 text-right">{index + 1}</span>
        </div>

        <div className="flex-1 grid gap-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="relative">
                <select
                  value={step.action}
                  onChange={(e) => onUpdate(step.id, "action", e.target.value)}
                  className="w-full px-2 py-1 text-xs rounded border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary/50 appearance-none"
                >
                  {VALID_ACTIONS.map((a) => (
                    <option key={a.value} value={a.value}>
                      {a.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 pointer-events-none text-muted-foreground" />
              </div>
            </div>
            <input
              type="text"
              value={step.description}
              onChange={(e) => onUpdate(step.id, "description", e.target.value)}
              placeholder="Description"
              className="px-2 py-1 text-xs rounded border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            {config.hasTarget && (
              <input
                type="text"
                value={step.target}
                onChange={(e) => onUpdate(step.id, "target", e.target.value)}
                placeholder={config.targetHint || "Target"}
                className="px-2 py-1 text-xs rounded border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
            )}
            {config.hasValue && (
              <input
                type="text"
                value={step.value}
                onChange={(e) => onUpdate(step.id, "value", e.target.value)}
                placeholder={config.valueHint || "Value"}
                className={cn(
                  "px-2 py-1 text-xs rounded border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary/50",
                  !config.hasTarget && "col-span-2"
                )}
              />
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => onRemove(step.id)}
          className="p-1 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors shrink-0"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
