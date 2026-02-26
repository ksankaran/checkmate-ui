"use client";

import { useState } from "react";
import { X } from "lucide-react";
import type { Environment, EnvironmentCreate, EnvironmentUpdate } from "@/types/environment";

interface Props {
  projectId: number;
  env?: Environment | null;
  onSave: (data: EnvironmentCreate | EnvironmentUpdate) => Promise<void>;
  onClose: () => void;
}

export function EnvironmentDialog({ projectId, env, onSave, onClose }: Props) {
  const isEdit = !!env;

  const [name, setName] = useState(env?.name ?? "");
  const [baseUrl, setBaseUrl] = useState(env?.base_url ?? "");
  const [isDefault, setIsDefault] = useState(env?.is_default ?? false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!name.trim()) {
      setError("Environment name is required.");
      return;
    }
    if (!baseUrl.trim()) {
      setError("Base URL is required.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      if (isEdit) {
        await onSave({
          name: name.trim(),
          base_url: baseUrl.trim(),
          is_default: isDefault,
        } as EnvironmentUpdate);
      } else {
        await onSave({
          project_id: projectId,
          name: name.trim(),
          base_url: baseUrl.trim(),
          is_default: isDefault,
        } as EnvironmentCreate);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save environment.");
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-background rounded-xl border border-border shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold">
            {isEdit ? "Edit Environment" : "New Environment"}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Production, Staging, FIT"
              className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Base URL */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Base URL</label>
            <input
              type="url"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://app.example.com"
              className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Overrides the project base URL when this environment is active.
            </p>
          </div>

          {/* Default toggle */}
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <div className="relative">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
              />
              <div className="w-9 h-5 bg-muted rounded-full peer peer-checked:bg-primary transition-colors" />
              <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4" />
            </div>
            <span className="text-sm">Set as default environment</span>
          </label>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-border hover:bg-muted transition-colors text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm disabled:opacity-60"
          >
            {saving ? "Saving…" : isEdit ? "Save Changes" : "Create Environment"}
          </button>
        </div>
      </div>
    </div>
  );
}
