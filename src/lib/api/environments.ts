import { API_URL } from "@/lib/api";
import type { Environment, EnvironmentCreate, EnvironmentUpdate } from "@/types/environment";

export const environmentsApi = {
  list(projectId: number): Promise<Environment[]> {
    return fetch(`${API_URL}/api/projects/${projectId}/environments`)
      .then((r) => r.json());
  },

  create(projectId: number, data: EnvironmentCreate): Promise<Environment> {
    return fetch(`${API_URL}/api/projects/${projectId}/environments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then((r) => r.json());
  },

  update(projectId: number, envId: number, data: EnvironmentUpdate): Promise<Environment> {
    return fetch(`${API_URL}/api/projects/${projectId}/environments/${envId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then((r) => r.json());
  },

  delete(projectId: number, envId: number): Promise<void> {
    return fetch(`${API_URL}/api/projects/${projectId}/environments/${envId}`, {
      method: "DELETE",
    }).then(() => undefined);
  },
};
