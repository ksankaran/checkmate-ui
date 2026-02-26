import { get, post, put, patch, del } from "./client";
import type { TestCase, TestCaseCreate, TestCaseUpdate, TestCaseStatus, Visibility } from "@/types";

export const testCasesApi = {
  getByProject: (projectId: number) =>
    get<TestCase[]>(`/api/test-cases/project/${projectId}`),

  get: (id: number) => get<TestCase>(`/api/test-cases/${id}`),

  create: (data: TestCaseCreate) => post<TestCase>("/api/test-cases", data),

  update: (id: number, data: TestCaseUpdate) =>
    put<TestCase>(`/api/test-cases/${id}`, data),

  delete: (id: number) => del(`/api/test-cases/${id}`),

  updateStatus: (id: number, status: TestCaseStatus) =>
    patch<TestCase>(`/api/test-cases/${id}/status`, { status }),

  updateVisibility: (id: number, visibility: Visibility) =>
    patch<TestCase>(`/api/test-cases/${id}/visibility`, { visibility }),
};
