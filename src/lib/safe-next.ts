export function safeNextPath(value?: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return "/workspace";
  }
  return value;
}
