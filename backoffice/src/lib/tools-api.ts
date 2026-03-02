import { TOOL_KEYS, type ToolKey } from "@/lib/tools";

export function isToolKey(value: string): value is ToolKey {
  return TOOL_KEYS.includes(value as ToolKey);
}
