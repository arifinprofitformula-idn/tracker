export function safeAuthRedirect(value?: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return "/dashboard";
  try {
    const parsed = new URL(value, "https://tracker.local");
    if (parsed.origin !== "https://tracker.local") return "/dashboard";
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return "/dashboard";
  }
}
