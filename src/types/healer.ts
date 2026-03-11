export interface HealedStep {
  action: string;
  target?: string;
  value?: string;
  description: string;
  /** Why this step changed. Undefined if unchanged. Stripped before PUT. */
  change_reason?: string;
}

export interface HealSuggestion {
  healed_steps: HealedStep[];
  /** 1-based step numbers that were modified. */
  changed_step_numbers: number[];
  /** Plain-language summary shown in the review dialog header. */
  explanation: string;
  /** 0.0–1.0 confidence score. */
  confidence: number;
}
