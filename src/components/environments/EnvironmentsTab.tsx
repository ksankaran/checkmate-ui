"use client";

import { useState } from "react";
import { Plus, Edit2, Trash2, Globe, Star } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { environmentsApi } from "@/lib/api/environments";
import { useEnvironment } from "@/context/EnvironmentContext";
import { envBadgeColor } from "@/types/environment";
import type { Environment, EnvironmentCreate, EnvironmentUpdate } from "@/types/environment";
import { EnvironmentDialog } from "./EnvironmentDialog";
import { cn } from "@/lib/utils";

interface Props {
  projectId: number;
}

export function EnvironmentsTab({ projectId }: Props) {
  const { environments, activeEnv, loadEnvironments } = useEnvironment();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Environment | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  async function handleSave(data: EnvironmentCreate | EnvironmentUpdate) {
    if (editTarget) {
      await environmentsApi.update(projectId, editTarget.id, data as EnvironmentUpdate);
    } else {
      await environmentsApi.create(projectId, data as EnvironmentCreate);
    }
    await loadEnvironments(projectId);
    setDialogOpen(false);
    setEditTarget(null);
  }

  function openCreate() {
    setEditTarget(null);
    setDialogOpen(true);
  }

  function openEdit(env: Environment) {
    setEditTarget(env);
    setDialogOpen(true);
  }

  async function handleDelete(env: Environment) {
    if (!confirm(`Delete environment "${env.name}"? This cannot be undone.`)) return;
    setDeletingId(env.id);
    try {
      await environmentsApi.delete(projectId, env.id);
      await loadEnvironments(projectId);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <motion.div
      key="environments"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Environments</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Define environments (DEV, STAGING, PROD) with base URLs and variables.
            Switch between them from the top bar.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm"
        >
          <Plus className="h-4 w-4" />
          New Environment
        </button>
      </div>

      {/* List */}
      {environments.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border py-16 flex flex-col items-center gap-3 text-center">
          <Globe className="h-8 w-8 text-muted-foreground/50" />
          <p className="text-muted-foreground text-sm">No environments yet</p>
          <button
            onClick={openCreate}
            className="text-primary text-sm hover:underline"
          >
            Create your first environment
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {environments.map((env) => (
              <motion.div
                key={env.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97 }}
                className="rounded-lg border border-border bg-card p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={cn(
                          "inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold border",
                          envBadgeColor(env.name),
                        )}
                      >
                        {env.name}
                      </span>
                      {env.is_default && (
                        <span className="inline-flex items-center gap-1 text-xs text-amber-600 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
                          <Star className="h-3 w-3" />
                          Default
                        </span>
                      )}
                      {activeEnv?.id === env.id && (
                        <span className="inline-flex items-center text-xs text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="mt-1.5 text-sm text-muted-foreground font-mono truncate">
                      {env.base_url}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => openEdit(env)}
                      className="p-1.5 rounded hover:bg-muted transition-colors"
                      title="Edit"
                    >
                      <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                    <button
                      onClick={() => handleDelete(env)}
                      disabled={deletingId === env.id}
                      className="p-1.5 rounded hover:bg-destructive/10 hover:text-destructive transition-colors disabled:opacity-50"
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Dialog */}
      {dialogOpen && (
        <EnvironmentDialog
          projectId={projectId}
          env={editTarget}
          onSave={handleSave}
          onClose={() => { setDialogOpen(false); setEditTarget(null); }}
        />
      )}
    </motion.div>
  );
}
