export type FolderType = "regular" | "smart";

export interface SmartCriteria {
  tags?: string[];
  statuses?: string[];
}

export interface TestFolder {
  id: number;
  project_id: number;
  name: string;
  description: string | null;
  folder_type: FolderType;
  parent_id: number | null;
  smart_criteria: string | null; // JSON string of SmartCriteria
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface TestFolderCreate {
  project_id: number;
  name: string;
  description?: string | null;
  folder_type?: FolderType;
  parent_id?: number | null;
  smart_criteria?: string | null;
  order_index?: number;
}

export interface TestFolderUpdate {
  name?: string;
  description?: string | null;
  parent_id?: number | null;
  order_index?: number;
  smart_criteria?: string | null;
}

export interface FolderTreeNode {
  folder: TestFolder;
  children: FolderTreeNode[];
  testCount: number;
}

export function parseSmartCriteria(json: string | null): SmartCriteria {
  if (!json) return {};
  try {
    return JSON.parse(json);
  } catch {
    return {};
  }
}
