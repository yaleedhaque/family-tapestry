export function safePath(path: string | null | undefined, fallback = "/"): string {
  if (!path) return fallback;
  return path.startsWith("/") && !path.startsWith("//") && !path.startsWith("/\\") ? path : fallback;
}