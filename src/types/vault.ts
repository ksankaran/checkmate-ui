export type CredentialType = "login" | "api_key" | "token" | "custom";

export interface Credential {
  id: number;
  name: string;
  username: string | null;
  description: string | null;
  credential_type: CredentialType;
  project_id: number;
  environment_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface CredentialCreate {
  project_id: number;
  name: string;
  credential_type: CredentialType;
  username?: string;
  description?: string;
  password?: string;
  api_key?: string;
  token?: string;
  custom_fields?: Record<string, string>;
  environment_id?: number | null;
}

export interface CredentialUpdate {
  name?: string;
  username?: string;
  description?: string;
  credential_type?: CredentialType;
  password?: string;
  api_key?: string;
  token?: string;
  custom_fields?: Record<string, string>;
  environment_id?: number | null;
}

export interface TestDataEntry {
  id: number;
  name: string;
  description: string | null;
  data: string;
  tags: string | null;
  project_id: number;
  environment_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface TestDataCreate {
  project_id: number;
  name: string;
  description?: string;
  data: string;
  tags?: string;
  environment_id?: number | null;
}

export interface TestDataUpdate {
  name?: string;
  description?: string;
  data?: string;
  tags?: string;
  environment_id?: number | null;
}

export interface RevealedCredential {
  password: string | null;
  api_key: string | null;
  token: string | null;
  custom_fields: Record<string, string> | null;
}

export interface CredentialSuggestion {
  name: string;
  credential_type: CredentialType;
  username?: string;
  password?: string;
  description?: string;
}
