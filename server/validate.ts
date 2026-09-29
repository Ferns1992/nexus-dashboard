const SAFE_UPLOAD_PATH = /^\/uploads\/[A-Za-z0-9._-]+$/;

export type ValidationResult =
  | { ok: true; value: string }
  | { ok: false; error: string };

export function normalizeLinkUrl(input: unknown): ValidationResult {
  if (typeof input !== "string" || input.trim().length === 0) {
    return { ok: false, error: "URL is required" };
  }

  const raw = input.trim();

  if (raw.length > 2048) {
    return { ok: false, error: "URL must be 2048 characters or fewer" };
  }

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return {
      ok: false,
      error: "URL must be absolute and start with http:// or https://",
    };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { ok: false, error: "Only http:// and https:// URLs are allowed" };
  }

  return { ok: true, value: parsed.toString() };
}

export function normalizeIconUrl(input: unknown): string {
  if (typeof input !== "string" || input.trim().length === 0) return "";

  const raw = input.trim();
  if (raw.length > 2048) return "";

  if (SAFE_UPLOAD_PATH.test(raw)) return raw;

  try {
    const parsed = new URL(raw);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return parsed.toString();
    }
  } catch {
    return "";
  }

  return "";
}

export function validatePassword(input: unknown): ValidationResult {
  if (typeof input !== "string") {
    return { ok: false, error: "Password is required" };
  }
  if (input.length < 8) {
    return { ok: false, error: "Password must be at least 8 characters" };
  }
  if (input.length > 200) {
    return { ok: false, error: "Password must be 200 characters or fewer" };
  }
  return { ok: true, value: input };
}

export function validateUsername(input: unknown): ValidationResult {
  if (typeof input !== "string") {
    return { ok: false, error: "Username is required" };
  }
  const trimmed = input.trim();
  if (trimmed.length < 3 || trimmed.length > 32) {
    return { ok: false, error: "Username must be 3 to 32 characters" };
  }
  if (!/^[a-zA-Z0-9._-]+$/.test(trimmed)) {
    return {
      ok: false,
      error: "Username may only contain letters, numbers, dots, underscores and hyphens",
    };
  }
  return { ok: true, value: trimmed };
}

const ROLES = new Set(["admin", "editor", "viewer"]);

export function isRole(input: unknown): input is "admin" | "editor" | "viewer" {
  return typeof input === "string" && ROLES.has(input);
}

export function isSafeUploadName(input: unknown): input is string {
  return (
    typeof input === "string" &&
    /^[A-Za-z0-9._-]+$/.test(input) &&
    input.length > 0 &&
    input.length <= 255 &&
    input !== "." &&
    input !== ".."
  );
}
