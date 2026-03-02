export const TOOL_KEYS = [
  "uptime_monitor",
  "analytics",
  "user_journeys",
  "data_protection",
  "backups",
  "error_logging",
  "event_logging",
  "visual_regression"
] as const;

export type ToolKey = (typeof TOOL_KEYS)[number];

export const TOOL_LABELS: Record<ToolKey, string> = {
  uptime_monitor: "Uptime Monitor",
  analytics: "Analytics",
  user_journeys: "User Journeys",
  data_protection: "Data Protection (GDPR/CCPA)",
  backups: "Backups",
  error_logging: "Error Logging",
  event_logging: "Event Logging",
  visual_regression: "Visual Regression Monitor"
};
