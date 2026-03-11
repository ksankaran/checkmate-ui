"use client";

import { cn } from "@/lib/utils";
import { Wifi, WifiOff, Loader2 } from "lucide-react";

type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error";

interface RecordingStatusProps {
  connectionStatus: ConnectionStatus;
  isRecording: boolean;
  stepCount: number;
}

export function RecordingStatus({
  connectionStatus,
  isRecording,
  stepCount,
}: RecordingStatusProps) {
  return (
    <div className="flex items-center gap-3 text-sm">
      {/* Connection indicator */}
      <div className="flex items-center gap-1.5">
        {connectionStatus === "connected" ? (
          <Wifi className="h-3.5 w-3.5 text-green-500" />
        ) : connectionStatus === "connecting" ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-yellow-500" />
        ) : (
          <WifiOff className="h-3.5 w-3.5 text-muted-foreground" />
        )}
        <span
          className={cn(
            connectionStatus === "connected" && "text-green-500",
            connectionStatus === "connecting" && "text-yellow-500",
            connectionStatus === "error" && "text-red-500",
            connectionStatus === "disconnected" && "text-muted-foreground"
          )}
        >
          {connectionStatus === "connected"
            ? "Connected"
            : connectionStatus === "connecting"
              ? "Connecting..."
              : connectionStatus === "error"
                ? "Connection error"
                : "Disconnected"}
        </span>
      </div>

      {/* Recording indicator */}
      {isRecording && (
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
          </span>
          <span className="text-red-500 font-medium">Recording</span>
        </div>
      )}

      {/* Step count */}
      {stepCount > 0 && (
        <span className="text-muted-foreground">
          {stepCount} step{stepCount !== 1 ? "s" : ""}
        </span>
      )}
    </div>
  );
}
