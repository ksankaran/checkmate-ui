import { useCallback, useEffect, useRef, useState } from "react";
import { API_URL } from "@/lib/api";
import type { RecordedStep } from "@/types/recorder";

type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error";

interface UseRecorderWebSocketReturn {
  steps: RecordedStep[];
  status: ConnectionStatus;
  isPaused: boolean;
  connect: (projectId: string) => void;
  disconnect: () => void;
  pause: () => void;
  resume: () => void;
  sendCommand: (command: string) => void;
  clearSteps: () => void;
}

export function useRecorderWebSocket(): UseRecorderWebSocketReturn {
  const [steps, setSteps] = useState<RecordedStep[]>([]);
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [isPaused, setIsPaused] = useState(false);
  const isPausedRef = useRef(false);
  const wsRef = useRef<WebSocket | null>(null);

  const connect = useCallback((projectId: string) => {
    if (wsRef.current) {
      wsRef.current.close();
    }

    setStatus("connecting");

    // Build WebSocket URL from the API_URL (replace http with ws)
    const wsBase = API_URL.replace(/^http/, "ws");
    const ws = new WebSocket(
      `${wsBase}/api/projects/${projectId}/recorder/ws`
    );

    ws.onopen = () => {
      setStatus("connected");
    };

    ws.onmessage = (event) => {
      if (isPausedRef.current) return; // Drop events while paused
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "step" && msg.data) {
          setSteps((prev) => [...prev, msg.data as RecordedStep]);
        }
      } catch {
        // Ignore malformed messages
      }
    };

    ws.onerror = () => {
      setStatus("error");
    };

    ws.onclose = () => {
      setStatus("disconnected");
      wsRef.current = null;
    };

    wsRef.current = ws;
  }, []);

  const pause = useCallback(() => {
    isPausedRef.current = true;
    setIsPaused(true);
  }, []);

  const resume = useCallback(() => {
    isPausedRef.current = false;
    setIsPaused(false);
  }, []);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setStatus("disconnected");
    isPausedRef.current = false;
    setIsPaused(false);
  }, []);

  const sendCommand = useCallback((command: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ command }));
    }
  }, []);

  const clearSteps = useCallback(() => {
    setSteps([]);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  return { steps, status, isPaused, connect, disconnect, pause, resume, sendCommand, clearSteps };
}
