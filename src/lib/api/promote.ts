import { get, post } from "./client";

export interface Remote {
  name: string;
}

export interface RemoteProject {
  id: number;
  name: string;
  base_url: string;
}

export interface PromoteRequest {
  test_case_ids: number[];
  project_id: number;
  remote_name: string;
  target_project_id?: number | null;
}

export interface PromoteResult {
  test_cases_created: number;
  test_cases_skipped: number;
  fixtures_created: number;
  fixtures_reused: number;
  warnings: string[];
}

export const promoteApi = {
  getRemotes: () => get<Remote[]>("/api/config/remotes"),
  getRemoteProjects: (remoteName: string) =>
    get<RemoteProject[]>(`/api/config/remotes/${remoteName}/projects`),
  promote: (data: PromoteRequest) =>
    post<PromoteResult>("/api/test-cases/promote", data),
};
