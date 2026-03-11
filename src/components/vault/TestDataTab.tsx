"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Pencil, Trash2, Database } from "lucide-react";
import { vaultApi } from "@/lib/api/vault";
import { TestDataDialog } from "./TestDataDialog";
import type { TestDataEntry } from "@/types/vault";
import type { Environment } from "@/types/environment";
import { envBadgeColor } from "@/types/environment";
import { cn } from "@/lib/utils";

interface Props {
  projectId: number;
  activeEnv: Environment | null;
}

export function TestDataTab({ projectId, activeEnv }: Props) {
  const [entries, setEntries] = useState<TestDataEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TestDataEntry | null>(null);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const data = await vaultApi.listTestData(projectId, activeEnv?.id);
      setEntries(data);
    } catch (error) {
      console.error("Failed to fetch test data:", error);
    } finally {
      setLoading(false);
    }
  }, [projectId, activeEnv?.id]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const handleAdd = () => {
    setEditingEntry(null);
    setDialogOpen(true);
  };

  const handleEdit = (entry: TestDataEntry) => {
    setEditingEntry(entry);
    setDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this test data entry?")) return;
    try {
      await vaultApi.deleteTestData(projectId, id);
      setEntries((prev) => prev.filter((e) => e.id !== id));
    } catch (error) {
      console.error("Failed to delete test data:", error);
    }
  };

  const handleSave = async (data: Record<string, unknown>) => {
    if (editingEntry) {
      await vaultApi.updateTestData(projectId, editingEntry.id, data);
    } else {
      await vaultApi.createTestData(projectId, {
        project_id: projectId,
        environment_id: activeEnv?.id ?? null,
        ...data,
      } as any);
    }
    await fetchEntries();
  };

  const getPreview = (jsonStr: string): string => {
    try {
      const parsed = JSON.parse(jsonStr);
      if (Array.isArray(parsed)) return `Array [${parsed.length} items]`;
      if (typeof parsed === "object" && parsed !== null) {
        const keys = Object.keys(parsed);
        return keys.slice(0, 3).join(", ") + (keys.length > 3 ? ` +${keys.length - 3} more` : "");
      }
      return String(parsed);
    } catch {
      return jsonStr.slice(0, 50);
    }
  };

  const getTags = (tagsStr: string | null): string[] => {
    if (!tagsStr) return [];
    try {
      return JSON.parse(tagsStr);
    } catch {
      return [];
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {entries.length} dataset{entries.length !== 1 ? "s" : ""}
          {activeEnv ? ` for ${activeEnv.name} + global` : " (all environments)"}
        </p>
        <button
          onClick={handleAdd}
          className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Test Data
        </button>
      </div>

      {entries.length === 0 ? (
        <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
          <Database className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground mb-1">No test data yet</p>
          <p className="text-xs text-muted-foreground">
            Store structured JSON data like user profiles, product IDs, or test parameters.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => {
            const entryTags = getTags(entry.tags);
            const isGlobal = entry.environment_id == null;

            return (
              <div
                key={entry.id}
                className="flex items-center justify-between p-4 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <p className="font-medium text-sm">{entry.name}</p>
                    {/* Environment badge */}
                    {isGlobal ? (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border">
                        Global
                      </span>
                    ) : activeEnv && entry.environment_id === activeEnv.id ? (
                      <span className={cn(
                        "text-xs px-1.5 py-0.5 rounded border font-medium",
                        envBadgeColor(activeEnv.name),
                      )}>
                        {activeEnv.name}
                      </span>
                    ) : null}
                    {entryTags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center px-1.5 py-0.5 text-xs rounded bg-muted text-muted-foreground"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {entry.description || getPreview(entry.data)}
                  </p>
                </div>

                <div className="flex items-center gap-1 shrink-0 ml-4">
                  <code className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded hidden sm:block">
                    {`{{data.${entry.name}.field}}`}
                  </code>
                  <button
                    onClick={() => handleEdit(entry)}
                    className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(entry.id)}
                    className="p-1.5 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <TestDataDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSave={handleSave}
        entry={editingEntry}
        activeEnv={activeEnv}
      />
    </div>
  );
}
