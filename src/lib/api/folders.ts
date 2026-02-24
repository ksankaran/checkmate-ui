import { get, post, put, patch, del } from "./client";
import type { TestFolder, TestFolderCreate, TestFolderUpdate } from "@/types";
import type { TestCase } from "@/types";

interface FolderRunResponse {
  test_case_ids: number[];
  count: number;
}

export const foldersApi = {
  listByProject(projectId: number): Promise<TestFolder[]> {
    return get<TestFolder[]>(`/api/folders/project/${projectId}`);
  },

  create(folder: TestFolderCreate): Promise<TestFolder> {
    return post<TestFolder>("/api/folders", folder);
  },

  get(folderId: number): Promise<TestFolder> {
    return get<TestFolder>(`/api/folders/${folderId}`);
  },

  update(folderId: number, data: TestFolderUpdate): Promise<TestFolder> {
    return put<TestFolder>(`/api/folders/${folderId}`, data);
  },

  delete(folderId: number, moveTestsTo?: number | null): Promise<void> {
    return del<void>(`/api/folders/${folderId}`);
  },

  getTestCases(folderId: number, includeDescendants = false): Promise<TestCase[]> {
    const qs = includeDescendants ? "?include_descendants=true" : "";
    return get<TestCase[]>(`/api/folders/${folderId}/test-cases${qs}`);
  },

  moveFolder(folderId: number, parentId: number | null): Promise<TestFolder> {
    return patch<TestFolder>(`/api/folders/${folderId}/move`, {
      parent_id: parentId,
    });
  },

  moveTestCase(testCaseId: number, folderId: number | null): Promise<TestCase> {
    return patch<TestCase>(`/api/folders/test-cases/${testCaseId}/move`, {
      folder_id: folderId,
    });
  },

  runFolder(folderId: number): Promise<FolderRunResponse> {
    return post<FolderRunResponse>(`/api/folders/${folderId}/run`);
  },
};
