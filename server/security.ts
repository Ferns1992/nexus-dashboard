import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { config } from "./config";

export type Role = "admin" | "editor" | "viewer";

export interface Session {
  id: number;
  username: string;
  role: Role;
}

declare global {
  namespace Express {
    interface Request {
      user?: Session;
    }
  }
}

export const AUTH_COOKIE = "nexus_token";

function readCookie(req: Request, name: string): string | null {
  const header = req.headers.cookie;
  if (!header) return null;
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}

export function setAuthCookie(res: Response, token: string) {
  res.cookie(AUTH_COOKIE, token, {
    httpOnly: true,
    sameSite: "strict",
    secure: config.cookieSecure,
    maxAge: config.sessionDays * 24 * 60 * 60 * 1000,
    path: "/",
  });
}

export function clearAuthCookie(res: Response) {
  res.clearCookie(AUTH_COOKIE, {
    httpOnly: true,
    sameSite: "strict",
    secure: config.cookieSecure,
    path: "/",
  });
}

export function signToken(user: Session): string {
  return jwt.sign({ id: user.id, username: user.username, role: user.role }, config.jwtSecret, {
    expiresIn: `${config.sessionDays}d`,
  });
}

function extractToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) return header.slice(7).trim();
  return readCookie(req, AUTH_COOKIE);
}

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as Session;
    if (!decoded?.id || !decoded?.username) {
      return res.status(401).json({ error: "Invalid token" });
    }
    req.user = { id: decoded.id, username: decoded.username, role: decoded.role };
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function requireRole(roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Forbidden: insufficient permissions" });
    }
    next();
  };
}

interface Attempt {
  count: number;
  resetAt: number;
}

const attempts = new Map<string, Attempt>();
let lastSweep = Date.now();

function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, value] of attempts) {
    if (value.resetAt <= now) attempts.delete(key);
  }
}

export function loginRateLimit(req: Request, res: Response, next: NextFunction) {
  const now = Date.now();
  sweep(now);

  const ip = req.ip ?? req.socket.remoteAddress ?? "unknown";
  const key = `login:${ip}`;
  const entry = attempts.get(key);

  if (entry && entry.resetAt > now && entry.count >= config.loginMaxAttempts) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    res.setHeader("Retry-After", String(retryAfter));
    return res.status(429).json({
      error: `Too many failed login attempts. Try again in ${Math.ceil(retryAfter / 60)} minute(s).`,
    });
  }

  res.locals.registerFailedLogin = () => {
    const current = attempts.get(key);
    if (!current || current.resetAt <= now) {
      attempts.set(key, { count: 1, resetAt: now + config.loginWindowMs });
    } else {
      current.count += 1;
    }
  };

  res.locals.clearFailedLogins = () => attempts.delete(key);

  next();
}

export function securityHeaders(req: Request, res: Response, next: NextFunction) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

  if (config.isProduction) {
    res.setHeader(
      "Content-Security-Policy",
      [
        "default-src 'self'",
        "base-uri 'self'",
        "object-src 'none'",
        "frame-ancestors 'none'",
        "form-action 'self'",
        "connect-src 'self'",
        "script-src 'self'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: blob: https: http:",
      ].join("; ")
    );
  } else {
    res.setHeader("Content-Security-Policy", "default-src 'self' 'unsafe-inline' 'unsafe-eval'");
  }

  next();
}
