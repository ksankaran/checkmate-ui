"use client";

import { useEffect, useState } from "react";
import { Loader2, Circle } from "lucide-react";
import { API_URL } from "@/lib/api";

interface BrowserStatus {
  id: string;
  name: string;
  headless: boolean;
  running: boolean;
}

interface ExecutorConfig {
  preload: boolean;
  browsers: BrowserStatus[];
}

export function ExecutorTab() {
  const [config, setConfig] = useState<ExecutorConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadConfig() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/executor/config`);
      if (!res.ok) throw new Error(`Executor unreachable (${res.status})`);
      setConfig(await res.json());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load executor config");
    } finally {
      setLoading(false);
    }
  }

  async function togglePreload(newValue: boolean) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/executor/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preload: newValue }),
      });
      if (!res.ok) throw new Error(`Failed to update config (${res.status})`);
      setConfig(await res.json());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to update executor config");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    loadConfig();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground py-8">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading executor config…
      </div>
    );
  }

  if (error && !config) {
    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
        {error}
        <button
          onClick={loadConfig}
          className="ml-3 underline underline-offset-2 hover:no-underline"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pre-warm toggle card */}
      <div className="rounded-lg border border-border bg-card p-5 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-semibold text-sm">Pre-warm browsers on startup</h3>
            <p className="text-sm text-muted-foreground mt-1">
              When enabled, all configured browsers launch immediately when the executor
              starts. Disable to use lazy mode — browsers start on the first test that
              needs them.
            </p>
          </div>

          {/* Toggle switch */}
          <button
            role="switch"
            aria-checked={config?.preload ?? false}
            disabled={saving}
            onClick={() => config && togglePreload(!config.preload)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60 ${
              config?.preload ? "bg-primary" : "bg-muted"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-md ring-0 transition-transform ${
                config?.preload ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {saving && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            {config?.preload ? "Stopping pre-warm…" : "Starting browsers…"}
          </div>
        )}

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        {/* Permanent hint when preload is OFF */}
        {!config?.preload && !saving && (
          <p className="text-xs text-muted-foreground bg-muted/50 rounded px-3 py-2">
            Browsers start on the first test run. To make this permanent, set{" "}
            <code className="font-mono">BROWSER_PRELOAD=false</code> in your{" "}
            <code className="font-mono">.env</code> file.
          </p>
        )}
      </div>

      {/* Browser status list */}
      {config && config.browsers.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-5 space-y-3">
          <h3 className="font-semibold text-sm">Configured Browsers</h3>
          <ul className="space-y-2">
            {config.browsers.map((b) => (
              <li key={b.id} className="flex items-center gap-3 text-sm">
                <Circle
                  className={`h-2.5 w-2.5 fill-current ${
                    b.running ? "text-green-500" : "text-muted-foreground/40"
                  }`}
                />
                <span className="flex-1">{b.name}</span>
                <span
                  className={`text-xs font-medium ${
                    b.running ? "text-green-600 dark:text-green-400" : "text-muted-foreground"
                  }`}
                >
                  {b.running ? "running" : "idle"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
