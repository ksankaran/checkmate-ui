export interface RecordConfig {
  base_url: string;
  viewport_width?: number;
  viewport_height?: number;
}

export interface RecordSession {
  session_id: string;
  ws_url: string;
}

export interface StepCoordinates {
  x: number;
  y: number;
  pageX: number;
  pageY: number;
}

export interface RecordedStep {
  action: string;
  target: string | null;
  value: string | null;
  description: string;
  is_credential: boolean;
  confidence: number;
  coordinates?: StepCoordinates | null;
  locators?: Record<string, any> | null;
  causes_navigation?: boolean;
}

export interface RecordStatus {
  active: boolean;
  session_id?: string;
  step_count: number;
}

export interface RecordStopResult {
  session_id: string;
  step_count: number;
  steps: RecordedStep[];
}

export interface GeneratedMetadata {
  name: string;
  description: string;
  priority: string;
  tags: string[];
}

export interface RefinedStep {
  action: string;
  target: string | null;
  value: string | null;
  description: string;
  coordinates?: StepCoordinates | null;
  locators?: Record<string, any> | null;
  causes_navigation?: boolean;
}

export interface RefineStepsResult {
  steps: RefinedStep[];
}
