export type Priority = "low" | "medium" | "high" | "critical";

export type TestCaseStatus =
  | "draft"
  | "active"
  | "ready"
  | "in_review"
  | "approved"
  | "skipped"
  | "archived";

export type Visibility = "private" | "public";

export interface TestStep {
  action: string;
  target?: string;
  value?: string;
  description?: string;
}

export interface TestCase {
  id: number;
  project_id: number;
  name: string;
  description: string | null;
  natural_query: string;
  steps: string; // JSON string of TestStep[]
  expected_result: string | null;
  tags: string | null; // JSON string of string[]
  fixture_ids: string | null; // JSON string of number[]
  priority: Priority;
  status: TestCaseStatus;
  visibility?: Visibility;
  folder_id: number | null;
  test_case_number: number | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface TestCaseCreate {
  project_id: number;
  name: string;
  natural_query: string;
  steps: string;
  description?: string | null;
  expected_result?: string | null;
  tags?: string | null;
  fixture_ids?: string | null;
  priority?: Priority;
  status?: TestCaseStatus;
}

export interface TestCaseUpdate {
  name?: string;
  description?: string | null;
  natural_query?: string;
  steps?: string;
  expected_result?: string | null;
  tags?: string | null;
  fixture_ids?: string | null;
  priority?: Priority;
  status?: TestCaseStatus;
  visibility?: Visibility;
}

export function parseSteps(stepsJson: string): TestStep[] {
  try {
    return JSON.parse(stepsJson) || [];
  } catch {
    return [];
  }
}

export function parseTags(tagsJson: string | null): string[] {
  if (!tagsJson) return [];
  try {
    const parsed = JSON.parse(tagsJson);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function parseFixtureIds(idsJson: string | null): number[] {
  if (!idsJson) return [];
  try {
    const parsed = JSON.parse(idsJson);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
