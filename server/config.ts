import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value || value.trim().length === 0) {
    throw new Error(
      `${name} is required. Copy .env.example to .env and set a real value. Refusing to start.`
    );
  }
  return value.trim();
}

function int(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = parseInt(raw, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer, got: ${raw}`);
  }
  return parsed;
}

function bool(name: string, fallback: boolean): boolean {
  const raw = process.env[name];
  if (raw === undefined) return fallback;
  return raw === "true" || raw === "1";
}

const INSECURE_SECRETS = new Set([
  "super-secret-key-change-me",
  "your-super-secret-jwt-key",
  "change-me",
  "secret",
]);

const jwtSecret = required("JWT_SECRET");

if (jwtSecret.length < 32) {
  throw new Error(
    `JWT_SECRET must be at least 32 characters, got ${jwtSecret.length}. Generate one with: openssl rand -base64 48`
  );
}

if (INSECURE_SECRETS.has(jwtSecret.toLowerCase())) {
  throw new Error(
    "JWT_SECRET is set to a well-known placeholder. Generate a real one with: openssl rand -base64 48"
  );
}

export const config = {
  port: int("PORT", 4020),
  isProduction: process.env.NODE_ENV === "production",
  jwtSecret,
  trustProxy: bool("TRUST_PROXY", false),
  cookieSecure: bool("COOKIE_SECURE", false),
  maxUploadBytes: int("MAX_UPLOAD_MB", 2) * 1024 * 1024,
  loginWindowMs: int("LOGIN_WINDOW_MINUTES", 15) * 60 * 1000,
  loginMaxAttempts: int("LOGIN_MAX_ATTEMPTS", 5),
  sessionDays: int("SESSION_DAYS", 7),
};
