const MAX_FIELD_LENGTHS: Record<string, number> = {
  fullName: 200,
  bio: 2000,
  birthPlace: 300,
  profession: 300,
  email: 254,
  phone: 50,
  address: 500,
  website: 500,
  title: 500,
  url: 2048,
  notes: 2000,
  query: 200,
};

export function sanitize(input: string): string {
  return input
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]*>/g, "")
    .trim();
}

export function sanitizeField(field: string, value: string): string {
  const cleaned = sanitize(value);
  const maxLen = MAX_FIELD_LENGTHS[field] ?? 1000;
  return cleaned.slice(0, maxLen);
}

export function validateEmail(email: string): boolean {
  if (!email) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function validateUrl(url: string): boolean {
  if (!url) return true;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function validateYear(year: string | number | undefined | null): boolean {
  if (year == null || year === "") return true;
  const n = Number(year);
  return Number.isInteger(n) && n >= 1 && n <= 9999;
}

// Appends a cache-buster (the person's updatedAt) to a Supabase Storage URL so that
// re-uploading a portrait forces the browser to fetch the new image instead of
// serving the stale cached one (the object URL is identical across uploads).
export function cachedPhotoUrl(photoUrl: string, updatedAt?: string | null): string {
  if (!photoUrl) return "";
  if (!updatedAt) return photoUrl;
  try {
    const u = new URL(photoUrl);
    u.searchParams.set("v", updatedAt.replace(/\D/g, ""));
    return u.toString();
  } catch {
    return photoUrl;
  }
}
