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
import { Loader2, Plus, Trash2, Eye, EyeOff } from "lucide-react";
import type { Credential, CredentialType } from "@/types/vault";
import type { Environment } from "@/types/environment";
import { useEnvironment } from "@/context/EnvironmentContext";

const CREDENTIAL_TYPES: { value: CredentialType; label: string; description: string }[] = [
  { value: "login", label: "Login", description: "Username & password" },
  { value: "api_key", label: "API Key", description: "API key or secret" },
  { value: "token", label: "Token", description: "Bearer token / JWT" },
  { value: "custom", label: "Custom", description: "Key-value pairs" },
];

function SecretInput({
  value,
  onChange,
  placeholder,
  required,
}: {
  value: string;
  onChange: (val: string) => void;
  placeholder: string;
  required?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input
        type={visible ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 pr-10 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
        required={required}
      />
      <button
        type="button"
        onClick={() => setVisible(!visible)}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
        tabIndex={-1}
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: Record<string, unknown>) => Promise<void>;
  credential?: Credential | null;
  activeEnv?: Environment | null;
}

export function CredentialDialog({ open, onOpenChange, onSave, credential, activeEnv }: Props) {
  const isEdit = !!credential;
  const { environments } = useEnvironment();

  const [name, setName] = useState("");
  const [credentialType, setCredentialType] = useState<CredentialType>("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [token, setToken] = useState("");
  const [description, setDescription] = useState("");
  const [customPairs, setCustomPairs] = useState<{ key: string; value: string }[]>([
    { key: "", value: "" },
  ]);
  const [environmentId, setEnvironmentId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      if (credential) {
        setName(credential.name);
        setCredentialType(credential.credential_type);
        setUsername(credential.username || "");
        setDescription(credential.description || "");
        setPassword("");
        setApiKey("");
        setToken("");
        setCustomPairs([{ key: "", value: "" }]);
        setEnvironmentId(credential.environment_id ?? null);
      } else {
        setName("");
        setCredentialType("login");
        setUsername("");
        setPassword("");
        setApiKey("");
        setToken("");
        setDescription("");
        setCustomPairs([{ key: "", value: "" }]);
        // Default to active env for new credentials
        setEnvironmentId(activeEnv?.id ?? null);
      }
    }
  }, [open, credential, activeEnv]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const data: Record<string, unknown> = {
      name,
      credential_type: credentialType,
      description: description || undefined,
      environment_id: environmentId,
    };

    if (credentialType === "login") {
      data.username = username;
      if (password) data.password = password;
    } else if (credentialType === "api_key") {
      if (apiKey) data.api_key = apiKey;
    } else if (credentialType === "token") {
      if (token) data.token = token;
    } else if (credentialType === "custom") {
      const fields: Record<string, string> = {};
      for (const pair of customPairs) {
        if (pair.key.trim()) {
          fields[pair.key.trim()] = pair.value;
        }
      }
      if (Object.keys(fields).length > 0) data.custom_fields = fields;
    }

    try {
      await onSave(data);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const addCustomPair = () => {
    setCustomPairs([...customPairs, { key: "", value: "" }]);
  };

  const removeCustomPair = (index: number) => {
    setCustomPairs(customPairs.filter((_, i) => i !== index));
  };

  const updateCustomPair = (index: number, field: "key" | "value", value: string) => {
    setCustomPairs(customPairs.map((p, i) => (i === index ? { ...p, [field]: value } : p)));
  };

  const isValid = () => {
    if (!name.trim()) return false;
    if (!isEdit) {
      if (credentialType === "login" && !password) return false;
      if (credentialType === "api_key" && !apiKey) return false;
      if (credentialType === "token" && !token) return false;
    }
    return true;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Credential" : "Add Credential"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update credential details. Leave secret fields empty to keep current values."
              : "Add a new credential to the vault."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Credential Type */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Type</label>
            <div className="grid grid-cols-4 gap-2">
              {CREDENTIAL_TYPES.map((ct) => (
                <button
                  key={ct.value}
                  type="button"
                  onClick={() => setCredentialType(ct.value)}
                  className={`px-3 py-2 text-xs rounded-lg border transition-colors ${
                    credentialType === ct.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  {ct.label}
                </button>
              ))}
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={
                credentialType === "login"
                  ? "e.g., admin, test_user"
                  : credentialType === "api_key"
                  ? "e.g., stripe_key, openai"
                  : "e.g., jwt_token, service_auth"
              }
              className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              Reference as <code className="bg-muted px-1 rounded">{`{{${name || "name"}.${
                credentialType === "login"
                  ? "username"
                  : credentialType === "api_key"
                  ? "api_key"
                  : credentialType === "token"
                  ? "token"
                  : "field"
              }}}`}</code>
            </p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What this credential is for"
              className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          {/* Environment scope */}
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
                Global credentials are available in all environments. Env-scoped ones override globals with the same name.
              </p>
            </div>
          )}

          {/* Type-specific fields */}
          {credentialType === "login" && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1.5">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g., admin@example.com"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Password {isEdit && <span className="text-muted-foreground">(leave empty to keep current)</span>}
                </label>
                <SecretInput
                  value={password}
                  onChange={setPassword}
                  placeholder="Enter password"
                  required={!isEdit}
                />
              </div>
            </>
          )}

          {credentialType === "api_key" && (
            <div>
              <label className="block text-sm font-medium mb-1.5">
                API Key {isEdit && <span className="text-muted-foreground">(leave empty to keep current)</span>}
              </label>
              <SecretInput
                value={apiKey}
                onChange={setApiKey}
                placeholder="Enter API key"
                required={!isEdit}
              />
            </div>
          )}

          {credentialType === "token" && (
            <div>
              <label className="block text-sm font-medium mb-1.5">
                Token {isEdit && <span className="text-muted-foreground">(leave empty to keep current)</span>}
              </label>
              <SecretInput
                value={token}
                onChange={setToken}
                placeholder="Enter bearer token or JWT"
                required={!isEdit}
              />
            </div>
          )}

          {credentialType === "custom" && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium">Key-Value Pairs</label>
                <button
                  type="button"
                  onClick={addCustomPair}
                  className="flex items-center gap-1 text-xs text-primary hover:text-primary/80"
                >
                  <Plus className="h-3 w-3" /> Add
                </button>
              </div>
              <div className="space-y-2">
                {customPairs.map((pair, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={pair.key}
                      onChange={(e) => updateCustomPair(i, "key", e.target.value)}
                      placeholder="Key"
                      className="flex-1 px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                    <div className="flex-1">
                      <SecretInput
                        value={pair.value}
                        onChange={(val) => updateCustomPair(i, "value", val)}
                        placeholder="Value"
                      />
                    </div>
                    {customPairs.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeCustomPair(i)}
                        className="p-1.5 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-500"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
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
              disabled={saving || !isValid()}
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
