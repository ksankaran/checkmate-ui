export interface Project {
  id: number;
  name: string;
  description: string | null;
  base_url: string;
  config: string | null;
  base_prompt: string | null;
  page_load_state: string | null;
  test_case_prefix: string | null;
  next_test_case_number: number;
  created_at: string;
  updated_at: string;
}

export interface ProjectCreate {
  name: string;
  base_url: string;
  description?: string | null;
  config?: string | null;
  base_prompt?: string | null;
  page_load_state?: string | null;
  test_case_prefix?: string | null;
}

export interface ProjectUpdate {
  name?: string;
  base_url?: string;
  description?: string | null;
  config?: string | null;
  base_prompt?: string | null;
  page_load_state?: string | null;
  test_case_prefix?: string | null;
}

export interface ProjectStats {
  total_projects: number;
  total_test_cases: number;
  recent_runs: number;
  pass_rate: number;
}
