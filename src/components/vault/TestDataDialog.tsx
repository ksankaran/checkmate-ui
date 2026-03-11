"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import type { TestDataEntry } from "@/types/vault";
import type { Environment } from "@/types/environment";
import { useEnvironment } from "@/context/EnvironmentContext";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: Record<string, unknown>) => Promise<void>;
  entry?: TestDataEntry | null;
  activeEnv?: Environment | null;
}

export function TestDataDialog({ open, onOpenChange, onSave, entry, activeEnv }: Props) {
  const isEdit = !!entry;
  const { environments } = useEnvironment();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [dataStr, setDataStr] = useState('{\n  \n}');
  const [tags, setTags] = useState("");
  const [environmentId, setEnvironmentId] = useState<number | null>(null);
  const [jsonError, setJsonError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      if (entry) {
        setName(entry.name);
        setDescription(entry.description || "");
        // Pretty-print the JSON
        try {
          const parsed = JSON.parse(entry.data);
          setDataStr(JSON.stringify(parsed, null, 2));
        } catch {
          setDataStr(entry.data);
        }
        const entryTags = entry.tags ? JSON.parse(entry.tags) : [];
        setTags(Array.isArray(entryTags) ? entryTags.join(", ") : "");
        setEnvironmentId(entry.environment_id ?? null);
      } else {
        setName("");
        setDescription("");
        setDataStr('{\n  \n}');
        setTags("");
        setEnvironmentId(activeEnv?.id ?? null);
      }
      setJsonError("");
    }
  }, [open, entry, activeEnv]);

  const validateJson = (str: string) => {
    try {
      JSON.parse(str);
      setJsonError("");
      return true;
    } catch (e: any) {
      setJsonError(e.message || "Invalid JSON");
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateJson(dataStr)) return;

    setSaving(true);

    const tagsArray = tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const data: Record<string, unknown> = {
      name,
      description: description || undefined,
      data: dataStr,
      tags: tagsArray.length > 0 ? JSON.stringify(tagsArray) : undefined,
      environment_id: environmentId,
    };

    try {
      await onSave(data);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Test Data" : "Add Test Data"}</DialogTitle>
          <DialogDescription>
            Store structured JSON data for use in test cases.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., valid_users, product_ids"
              className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              Reference as <code className="bg-muted px-1 rounded">{`{{data.${name || "name"}.field}}`}</code>
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What this data is for"
              className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Data (JSON)</label>
            <textarea
              value={dataStr}
              onChange={(e) => {
                setDataStr(e.target.value);
                if (jsonError) validateJson(e.target.value);
              }}
              onBlur={() => validateJson(dataStr)}
              rows={8}
              className={`w-full px-3 py-2 text-sm font-mono rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                jsonError ? "border-red-500" : "border-border"
              }`}
              placeholder='{"email": "test@example.com", "name": "Test User"}'
              required
            />
            {jsonError && (
              <p className="text-xs text-red-500 mt-1">{jsonError}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Tags</label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="e.g., users, auth, smoke"
              className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          {environments.length > 0 && (
            <div>
              <label className="block text-sm font-medium mb-1.5">Environment</label>
              <select
                value={environmentId ?? ""}
                onChange={(e) => setEnvironmentId(e.target.value ? Number(e.target.value) : null)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="">Global (all environments)</option>
                {environments.map((env) => (
                  <option key={env.id} value={env.id}>{env.name}</option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground mt-1">
                Global datasets are available in all environments. Env-scoped ones override globals with the same name.
              </p>
            </div>
          )}

          <DialogFooter>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !name.trim() || !dataStr.trim() || !!jsonError}
              className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? "Update" : "Create"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
