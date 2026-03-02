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

export const TOOL_DESCRIPTIONS: Record<ToolKey, string> = {
  uptime_monitor: "Track site availability with heartbeat checks and outage notifications.",
  analytics: "Collect traffic and behavior analytics across your properties.",
  user_journeys: "Capture common user flows and drop-off points.",
  data_protection: "Enable governance controls for privacy and consent compliance.",
  backups: "Automate backups of key configuration and metadata.",
  error_logging: "Aggregate runtime and application error events.",
  event_logging: "Store structured event logs for audits and debugging.",
  visual_regression: "Detect UI changes by comparing page snapshots over time."
};

export function isToolKey(value: string): value is ToolKey {
  return TOOL_KEYS.includes(value as ToolKey);
}
