import { get } from "./client";
import { streamUrl } from "./client";
import type { TestRun, TestRunStep, BrowserOption } from "@/types";

export const testRunsApi = {
  getByProject: (projectId: number, limit = 100) =>
    get<TestRun[]>(`/api/test-runs/project/${projectId}?limit=${limit}`),

  getByTestCase: (testCaseId: number, limit = 100) =>
    get<TestRun[]>(`/api/test-runs/test-case/${testCaseId}?limit=${limit}`),

  getByThread: (projectId: number, threadId: string) =>
    get<TestRun[]>(`/api/test-runs/project/${projectId}/thread/${threadId}`),

  get: (id: number) => get<TestRun>(`/api/test-runs/${id}`),

  getSteps: (runId: number) =>
    get<TestRunStep[]>(`/api/test-runs/${runId}/steps`),

  getBrowsers: () => get<BrowserOption[]>("/api/test-runs/browsers"),

  streamRunUrl: (projectId: number, testCaseId: number, browser?: string) => {
    const params = new URLSearchParams();
    if (browser) params.set("browser", browser);
    return streamUrl(
      `/api/test-cases/${testCaseId}/project/${projectId}/run/stream?${params}`,
    );
  },

  streamBatchRunUrl: (projectId: number) =>
    streamUrl(`/api/test-cases/project/${projectId}/run-batch/stream`),
};
