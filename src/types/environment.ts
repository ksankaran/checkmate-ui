export interface Environment {
  id: number;
  project_id: number;
  name: string;
  base_url: string;
  variables: string; // JSON string: {"KEY": "value"}
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface EnvironmentCreate {
  project_id: number;
  name: string;
  base_url: string;
  variables?: Record<string, string>;
  is_default?: boolean;
}

export interface EnvironmentUpdate {
  name?: string;
  base_url?: string;
  variables?: Record<string, string>;
  is_default?: boolean;
}

/** Parsed variables object from environment.variables JSON string */
export type EnvVariables = Record<string, string>;

/** Returns the color class for an environment badge based on its name */
export function envBadgeColor(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes("prod")) return "bg-red-500/15 text-red-500 border-red-500/30";
  if (lower.includes("staging") || lower.includes("uat") || lower.includes("stage"))
    return "bg-yellow-500/15 text-yellow-600 border-yellow-500/30";
  if (lower.includes("fit") || lower.includes("qa") || lower.includes("test"))
    return "bg-blue-500/15 text-blue-500 border-blue-500/30";
  // dev / local / default
  return "bg-green-500/15 text-green-600 border-green-500/30";
}
