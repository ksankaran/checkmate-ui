export const VALID_ACTIONS = [
  { value: "navigate", label: "Navigate", hasTarget: false, hasValue: true, valueHint: "URL path (e.g., /login)" },
  { value: "click", label: "Click", hasTarget: true, hasValue: false, targetHint: "Element description" },
  { value: "type", label: "Type", hasTarget: true, hasValue: true, targetHint: "Input field", valueHint: "Text to type" },
  { value: "fill_form", label: "Fill Form", hasTarget: false, hasValue: true, valueHint: 'JSON: {"field": "value"}' },
  { value: "select", label: "Select", hasTarget: true, hasValue: true, targetHint: "Dropdown element", valueHint: "Option to select" },
  { value: "hover", label: "Hover", hasTarget: true, hasValue: false, targetHint: "Element to hover" },
  { value: "press_key", label: "Press Key", hasTarget: false, hasValue: true, valueHint: "Key name (Enter, Tab)" },
  { value: "wait", label: "Wait", hasTarget: true, hasValue: true, targetHint: "Element/text (optional)", valueHint: "Time in ms (optional)" },
  { value: "wait_for_page", label: "Wait for Page", hasTarget: false, hasValue: true, valueHint: "load, domcontentloaded, or networkidle" },
  { value: "screenshot", label: "Screenshot", hasTarget: false, hasValue: true, valueHint: "Filename (optional)" },
  { value: "assert_text", label: "Assert Text", hasTarget: false, hasValue: true, valueHint: "Expected text" },
  { value: "assert_element", label: "Assert Element", hasTarget: true, hasValue: false, targetHint: "Element description" },
  { value: "assert_style", label: "Assert Style", hasTarget: true, hasValue: true, targetHint: "Element", valueHint: '{"property": "color", "expected": "red"}' },
  { value: "assert_url", label: "Assert URL", hasTarget: false, hasValue: true, valueHint: "Regex pattern" },
  { value: "back", label: "Go Back", hasTarget: false, hasValue: false },
  { value: "evaluate", label: "Evaluate JS", hasTarget: false, hasValue: true, valueHint: "JavaScript code" },
  { value: "upload", label: "Upload File", hasTarget: false, hasValue: true, valueHint: "File path" },
  { value: "drag", label: "Drag & Drop", hasTarget: true, hasValue: true, targetHint: "Start element", valueHint: "End element" },
  { value: "scroll", label: "Scroll", hasTarget: true, hasValue: true, targetHint: "Element to scroll to (optional)", valueHint: "top, bottom, up, down, smooth_bottom, smooth_top, or pixels" },
] as const;

export type ActionValue = (typeof VALID_ACTIONS)[number]["value"];

export const ACTION_LABELS: Record<string, string> = Object.fromEntries(
  VALID_ACTIONS.map((a) => [a.value, a.label]),
);

export const PRIORITIES = [
  { value: "critical", label: "Critical", color: "text-red-600" },
  { value: "high", label: "High", color: "text-orange-500" },
  { value: "medium", label: "Medium", color: "text-yellow-500" },
  { value: "low", label: "Low", color: "text-green-500" },
] as const;

export type PriorityValue = (typeof PRIORITIES)[number]["value"];

export const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  active: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  ready: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  in_review: "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400",
  approved: "bg-green-500/15 text-green-600 dark:text-green-400",
  skipped: "bg-orange-500/15 text-orange-600 dark:text-orange-400",
  archived: "bg-muted text-muted-foreground",
};

export const RUN_STATUS_COLORS: Record<string, string> = {
  pending: "text-muted-foreground",
  running: "text-blue-500",
  passed: "text-green-500",
  failed: "text-red-500",
  cancelled: "text-muted-foreground",
  skipped: "text-muted-foreground",
};
