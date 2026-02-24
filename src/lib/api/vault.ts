import { get, post, put, del } from "./client";
import type {
  Credential,
  CredentialCreate,
  CredentialUpdate,
  RevealedCredential,
  TestDataEntry,
  TestDataCreate,
  TestDataUpdate,
} from "@/types/vault";

export const vaultApi = {
  // Credentials
  listCredentials: (projectId: number, envId?: number | null) =>
    get<Credential[]>(
      `/api/projects/${projectId}/vault/credentials${envId != null ? `?environment_id=${envId}` : ""}`,
    ),

  createCredential: (projectId: number, data: CredentialCreate) =>
    post<Credential>(`/api/projects/${projectId}/vault/credentials`, data),

  getCredential: (projectId: number, id: number) =>
    get<Credential>(`/api/projects/${projectId}/vault/credentials/${id}`),

  updateCredential: (projectId: number, id: number, data: CredentialUpdate) =>
    put<Credential>(`/api/projects/${projectId}/vault/credentials/${id}`, data),

  revealCredential: (projectId: number, id: number) =>
    get<RevealedCredential>(`/api/projects/${projectId}/vault/credentials/${id}/reveal`),

  deleteCredential: (projectId: number, id: number) =>
    del(`/api/projects/${projectId}/vault/credentials/${id}`),

  // Test Data
  listTestData: (projectId: number, envId?: number | null) =>
    get<TestDataEntry[]>(
      `/api/projects/${projectId}/vault/test-data${envId != null ? `?environment_id=${envId}` : ""}`,
    ),

  createTestData: (projectId: number, data: TestDataCreate) =>
    post<TestDataEntry>(`/api/projects/${projectId}/vault/test-data`, data),

  getTestData: (projectId: number, id: number) =>
    get<TestDataEntry>(`/api/projects/${projectId}/vault/test-data/${id}`),

  updateTestData: (projectId: number, id: number, data: TestDataUpdate) =>
    put<TestDataEntry>(`/api/projects/${projectId}/vault/test-data/${id}`, data),

  deleteTestData: (projectId: number, id: number) =>
    del(`/api/projects/${projectId}/vault/test-data/${id}`),
};
