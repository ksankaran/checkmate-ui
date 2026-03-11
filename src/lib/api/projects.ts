import { get, post, put, del } from "./client";
import type { Project, ProjectCreate, ProjectUpdate, ProjectStats } from "@/types";

export const projectsApi = {
  list: () => get<Project[]>("/api/projects"),

  get: (id: number) => get<Project>(`/api/projects/${id}`),

  create: (data: ProjectCreate) => post<Project>("/api/projects", data),

  update: (id: number, data: ProjectUpdate) =>
    put<Project>(`/api/projects/${id}`, data),

  delete: (id: number) => del(`/api/projects/${id}`),

  getStats: () => get<ProjectStats>("/api/projects/stats"),
};
