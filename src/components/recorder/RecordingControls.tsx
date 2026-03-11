"use client";

import { Circle, Square, Pause, Play, Trash2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface RecordingControlsProps {
  isRecording: boolean;
  isStarting: boolean;
  isStopping: boolean;
  isPaused: boolean;
  hasSteps: boolean;
  disabled?: boolean;
  onStart: () => void;
  onStop: () => void;
  onPause: () => void;
  onResume: () => void;
  onDiscard: () => void;
}

export function RecordingControls({
  isRecording,
  isStarting,
  isStopping,
  isPaused,
  hasSteps,
  disabled,
  onStart,
  onStop,
  onPause,
  onResume,
  onDiscard,
}: RecordingControlsProps) {
  return (
    <div className="flex items-center gap-2">
      {!isRecording ? (
        /* Not recording — show Record button */
        <button
          onClick={onStart}
          disabled={isStarting || disabled}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
            "bg-red-500 text-white hover:bg-red-600",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          {isStarting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Circle className="h-4 w-4 fill-current" />
          )}
          {isStarting ? "Starting..." : "Record"}
        </button>
      ) : (
        /* Recording — show Pause/Resume + Stop */
        <>
          {isPaused ? (
            <button
              onClick={onResume}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                "bg-primary text-primary-foreground hover:bg-primary/90",
              )}
            >
              <Play className="h-4 w-4 fill-current" />
              Resume
            </button>
          ) : (
            <button
              onClick={onPause}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                "border border-border text-foreground hover:bg-muted",
              )}
            >
              <Pause className="h-4 w-4 fill-current" />
              Pause
            </button>
          )}

          <button
            onClick={onStop}
            disabled={isStopping}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              "bg-muted text-foreground hover:bg-muted/80",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            {isStopping ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Square className="h-4 w-4 fill-current" />
            )}
            {isStopping ? "Stopping..." : "Stop"}
          </button>
        </>
      )}

      {hasSteps && !isRecording && (
        <button
          onClick={onDiscard}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
        >
          <Trash2 className="h-4 w-4" />
          Discard
        </button>
      )}
    </div>
  );
}
