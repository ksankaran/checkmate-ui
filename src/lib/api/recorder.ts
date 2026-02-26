import { get, post } from "./client";
import type {
  RecordConfig,
  RecordSession,
  RecordStatus,
  RecordStopResult,
  GeneratedMetadata,
  RefineStepsResult,
} from "@/types/recorder";

export const recorderApi = {
  startSession: (projectId: number, config: RecordConfig) =>
    post<RecordSession>(`/api/projects/${projectId}/recorder/start`, config),

  stopSession: (projectId: number) =>
    post<RecordStopResult>(`/api/projects/${projectId}/recorder/stop`),

  getStatus: (projectId: number) =>
    get<RecordStatus>(`/api/projects/${projectId}/recorder/status`),

  refineSteps: (
    projectId: number,
    steps: { action: string; target?: string | null; value?: string | null; description?: string; is_credential?: boolean; coordinates?: { x: number; y: number; pageX: number; pageY: number } | null; causes_navigation?: boolean }[],
    baseUrl: string,
  ) =>
    post<RefineStepsResult>(`/api/projects/${projectId}/recorder/refine-steps`, {
      steps,
      base_url: baseUrl,
    }),

  generateMetadata: (
    projectId: number,
    steps: { action: string; target?: string | null; value?: string | null; description?: string; is_credential?: boolean }[],
    baseUrl: string,
  ) =>
    post<GeneratedMetadata>(`/api/projects/${projectId}/recorder/generate-metadata`, {
      steps,
      base_url: baseUrl,
    }),
};
