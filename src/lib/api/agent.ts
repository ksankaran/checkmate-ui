import { streamUrl } from "./client";

export const agentApi = {
  streamBuildUrl: (projectId: number) =>
    streamUrl(`/api/agent/projects/${projectId}/build`),

  streamChatUrl: (projectId: number) =>
    streamUrl(`/api/agent/projects/${projectId}/chat`),
};
