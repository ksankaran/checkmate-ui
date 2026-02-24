"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Pencil, Trash2, KeyRound, Key, Shield, Braces, Eye, EyeOff, Loader2, Copy, Check } from "lucide-react";
import { vaultApi } from "@/lib/api/vault";
import { CredentialDialog } from "./CredentialDialog";
import type { Credential, CredentialType, RevealedCredential } from "@/types/vault";
import type { Environment } from "@/types/environment";
import { envBadgeColor } from "@/types/environment";
import { cn } from "@/lib/utils";

const TYPE_CONFIG: Record<CredentialType, { label: string; icon: React.ReactNode; color: string }> = {
  login: { label: "Login", icon: <KeyRound className="h-3.5 w-3.5" />, color: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
  api_key: { label: "API Key", icon: <Key className="h-3.5 w-3.5" />, color: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
  token: { label: "Token", icon: <Shield className="h-3.5 w-3.5" />, color: "bg-green-500/10 text-green-500 border-green-500/20" },
  custom: { label: "Custom", icon: <Braces className="h-3.5 w-3.5" />, color: "bg-purple-500/10 text-purple-500 border-purple-500/20" },
};

interface Props {
  projectId: number;
  activeEnv: Environment | null;
}

export function CredentialsTab({ projectId, activeEnv }: Props) {
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCredential, setEditingCredential] = useState<Credential | null>(null);
  const [revealedSecrets, setRevealedSecrets] = useState<Record<number, RevealedCredential>>({});
  const [revealingId, setRevealingId] = useState<number | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const fetchCredentials = useCallback(async () => {
    setLoading(true);
    try {
      const data = await vaultApi.listCredentials(projectId, activeEnv?.id);
      setCredentials(data);
    } catch (error) {
      console.error("Failed to fetch credentials:", error);
    } finally {
      setLoading(false);
    }
  }, [projectId, activeEnv?.id]);

  useEffect(() => {
    fetchCredentials();
  }, [fetchCredentials]);

  const handleAdd = () => {
    setEditingCredential(null);
    setDialogOpen(true);
  };

  const handleEdit = (cred: Credential) => {
    setEditingCredential(cred);
    setDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this credential?")) return;
    try {
      await vaultApi.deleteCredential(projectId, id);
      setCredentials((prev) => prev.filter((c) => c.id !== id));
    } catch (error) {
      console.error("Failed to delete credential:", error);
    }
  };

  const handleSave = async (data: Record<string, unknown>) => {
    if (editingCredential) {
      await vaultApi.updateCredential(projectId, editingCredential.id, data);
    } else {
      await vaultApi.createCredential(projectId, {
        project_id: projectId,
        // Default new credentials to the active env if one is selected
        environment_id: activeEnv?.id ?? null,
        ...data,
      } as any);
    }
    await fetchCredentials();
  };

  const handleRevealToggle = async (cred: Credential) => {
    if (revealedSecrets[cred.id]) {
      setRevealedSecrets((prev) => {
        const next = { ...prev };
        delete next[cred.id];
        return next;
      });
      return;
    }

    setRevealingId(cred.id);
    try {
      const secrets = await vaultApi.revealCredential(projectId, cred.id);
      setRevealedSecrets((prev) => ({ ...prev, [cred.id]: secrets }));
    } catch (error) {
      console.error("Failed to reveal credential:", error);
    } finally {
      setRevealingId(null);
    }
  };

  const handleCopy = async (text: string, fieldKey: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(fieldKey);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const getRevealedDisplay = (cred: Credential): { label: string; value: string }[] => {
    const secrets = revealedSecrets[cred.id];
    if (!secrets) return [];

    const items: { label: string; value: string }[] = [];
    if (cred.credential_type === "login") {
      if (secrets.password) items.push({ label: "Password", value: secrets.password });
    } else if (cred.credential_type === "api_key") {
      if (secrets.api_key) items.push({ label: "API Key", value: secrets.api_key });
    } else if (cred.credential_type === "token") {
      if (secrets.token) items.push({ label: "Token", value: secrets.token });
    } else if (cred.credential_type === "custom" && secrets.custom_fields) {
      for (const [k, v] of Object.entries(secrets.custom_fields)) {
        items.push({ label: k, value: v });
      }
    }
    return items;
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
          {credentials.length} credential{credentials.length !== 1 ? "s" : ""}
          {activeEnv ? ` for ${activeEnv.name} + global` : " (all environments)"}
        </p>
        <button
          onClick={handleAdd}
          className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Credential
        </button>
      </div>

      {credentials.length === 0 ? (
        <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
          <KeyRound className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground mb-1">No credentials yet</p>
          <p className="text-xs text-muted-foreground">
            Add login credentials, API keys, or tokens for use in test cases.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {credentials.map((cred) => {
            const typeConfig = TYPE_CONFIG[cred.credential_type] || TYPE_CONFIG.login;
            const isRevealed = !!revealedSecrets[cred.id];
            const isRevealing = revealingId === cred.id;
            const revealedItems = getRevealedDisplay(cred);
            const isGlobal = cred.environment_id == null;

            return (
              <div
                key={cred.id}
                className="rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded-md border ${typeConfig.color}`}>
                      {typeConfig.icon}
                      {typeConfig.label}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-sm">{cred.name}</p>
                        {/* Environment badge */}
                        {isGlobal ? (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border">
                            Global
                          </span>
                        ) : activeEnv && cred.environment_id === activeEnv.id ? (
                          <span className={cn(
                            "text-xs px-1.5 py-0.5 rounded border font-medium",
                            envBadgeColor(activeEnv.name),
                          )}>
                            {activeEnv.name}
                          </span>
                        ) : null}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {cred.credential_type === "login" && cred.username
                          ? `User: ${cred.username}`
                          : cred.description || "No description"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0 ml-4">
                    <code className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded hidden sm:block">
                      {`{{${cred.name}.${
                        cred.credential_type === "login"
                          ? "password"
                          : cred.credential_type === "api_key"
                          ? "api_key"
                          : cred.credential_type === "token"
                          ? "token"
                          : "field"
                      }}}`}
                    </code>
                    <button
                      onClick={() => handleRevealToggle(cred)}
                      disabled={isRevealing}
                      className={`p-1.5 rounded transition-colors ${
                        isRevealed
                          ? "bg-primary/10 text-primary hover:bg-primary/20"
                          : "hover:bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                      title={isRevealed ? "Hide secrets" : "Reveal secrets"}
                    >
                      {isRevealing ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : isRevealed ? (
                        <EyeOff className="h-3.5 w-3.5" />
                      ) : (
                        <Eye className="h-3.5 w-3.5" />
                      )}
                    </button>
                    <button
                      onClick={() => handleEdit(cred)}
                      className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(cred.id)}
                      className="p-1.5 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {isRevealed && revealedItems.length > 0 && (
                  <div className="border-t border-border px-4 py-3 bg-muted/30 rounded-b-lg">
                    <div className="space-y-2">
                      {revealedItems.map((item) => {
                        const fieldKey = `${cred.id}-${item.label}`;
                        return (
                          <div key={item.label} className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground w-20 shrink-0">{item.label}:</span>
                            <code className="flex-1 text-xs bg-background px-2 py-1 rounded border border-border font-mono truncate">
                              {item.value}
                            </code>
                            <button
                              onClick={() => handleCopy(item.value, fieldKey)}
                              className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0"
                              title="Copy to clipboard"
                            >
                              {copiedField === fieldKey ? (
                                <Check className="h-3.5 w-3.5 text-green-500" />
                              ) : (
                                <Copy className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <CredentialDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSave={handleSave}
        credential={editingCredential}
        activeEnv={activeEnv}
      />
    </div>
  );
}
