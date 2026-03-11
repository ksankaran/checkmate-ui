import { get, post, put, del } from "./client";

export interface Persona {
  id: number;
  project_id: number;
  name: string;
  username: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface PageEntry {
  id: number;
  project_id: number;
  name: string;
  path: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface Fixture {
  id: number;
  project_id: number;
  name: string;
  description: string | null;
  setup_steps: string;
  scope: string;
  cache_ttl_seconds: number;
  created_at: string;
  updated_at: string;
  has_valid_cache?: boolean;
  cache_expires_at?: string | null;
}

export interface NotificationChannel {
  id: number;
  project_id: number;
  name: string;
  channel_type: string;
  enabled: boolean;
  webhook_url: string | null;
  webhook_template: string | null;
  email_recipients: string | null;
  email_template: string | null;
  notify_on: string;
  created_at: string;
  updated_at: string;
}

export interface ScheduleEntry {
  id: number;
  project_id: number;
  name: string;
  description: string | null;
  cron_expression: string;
  timezone: string;
  target_type: string;
  target_test_case_ids: string | null;
  target_tags: string | null;
  browser: string | null;
  retry_max: number;
  retry_mode: string | null;
  enabled: boolean;
  notification_channel_ids: string | null;
  last_run_at: string | null;
  next_run_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Features {
  intelligent_retry: boolean;
  multiple_environments: boolean;
}

export const settingsApi = {
  // Features
  getFeatures: () => get<Features>("/api/features"),


  // Personas
  getPersonas: (projectId: number) =>
    get<Persona[]>(`/api/projects/${projectId}/personas`),
  createPersona: (data: { project_id: number; name: string; username: string; password: string; description?: string }) =>
    post<Persona>("/api/personas", data),
  updatePersona: (id: number, data: Record<string, unknown>) =>
    put<Persona>(`/api/personas/${id}`, data),
  deletePersona: (id: number) => del(`/api/personas/${id}`),

  // Pages
  getPages: (projectId: number) =>
    get<PageEntry[]>(`/api/projects/${projectId}/pages`),
  createPage: (data: { project_id: number; name: string; path: string; description?: string }) =>
    post<PageEntry>("/api/pages", data),
  updatePage: (id: number, data: Record<string, unknown>) =>
    put<PageEntry>(`/api/pages/${id}`, data),
  deletePage: (id: number) => del(`/api/pages/${id}`),

  // Fixtures
  getFixtures: (projectId: number) =>
    get<Fixture[]>(`/api/projects/${projectId}/fixtures`),

  // Notification Channels
  getChannels: (projectId: number) =>
    get<NotificationChannel[]>(`/api/projects/${projectId}/notification-channels`),
  createChannel: (data: Record<string, unknown>) =>
    post<NotificationChannel>("/api/notification-channels", data),
  updateChannel: (id: number, data: Record<string, unknown>) =>
    put<NotificationChannel>(`/api/notification-channels/${id}`, data),
  deleteChannel: (id: number) => del(`/api/notification-channels/${id}`),

  // Schedules
  getSchedules: (projectId: number) =>
    get<ScheduleEntry[]>(`/api/projects/${projectId}/schedules`),
  createSchedule: (data: Record<string, unknown>) =>
    post<ScheduleEntry>("/api/schedules", data),
  updateSchedule: (id: number, data: Record<string, unknown>) =>
    put<ScheduleEntry>(`/api/schedules/${id}`, data),
  deleteSchedule: (id: number) => del(`/api/schedules/${id}`),
};
