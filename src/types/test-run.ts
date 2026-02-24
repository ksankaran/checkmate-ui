export type RunTrigger = "manual" | "scheduled" | "natural_language" | "ci_cd";

export type RunStatus = "pending" | "running" | "passed" | "failed" | "cancelled";

export type StepStatus = "pending" | "running" | "passed" | "failed" | "skipped";

export interface TestRun {
  id: number;
  project_id: number;
  test_case_id: number | null;
  trigger: RunTrigger;
  status: RunStatus;
  thread_id: string | null;
  batch_label: string | null;
  started_at: string | null;
  completed_at: string | null;
  summary: string | null;
  error_count: number;
  pass_count: number;
  created_at: string;
  retry_attempt: number;
  max_retries: number;
  original_run_id: number | null;
  retry_mode: string | null;
  retry_reason: string | null;
}

export interface TestRunStep {
  id: number;
  test_run_id: number;
  test_case_id: number | null;
  step_number: number;
  action: string;
  target: string | null;
  value: string | null;
  status: StepStatus;
  result: string | null;
  screenshot: string | null;
  duration: number | null;
  error: string | null;
  logs: string | null;
  fixture_name: string | null;
  created_at: string;
}

export interface BrowserOption {
  id: string;
  name: string;
  headless: boolean;
}
