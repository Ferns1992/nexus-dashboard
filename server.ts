import express from "express";
import type { NextFunction, Request, Response } from "express";
import multer from "multer";
import bcrypt from "bcryptjs";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

import { config } from "./server/config";
import db, { closeDatabase, countAdmins, dataDir, uploadsDir } from "./server/db";
import {
  authenticate,
  clearAuthCookie,
  loginRateLimit,
  requireRole,
  securityHeaders,
  setAuthCookie,
  signToken,
  type Role,
  type Session,
} from "./server/security";
import {
  isRole,
  isSafeUploadName,
  normalizeIconUrl,
  normalizeLinkUrl,
  validatePassword,
  validateUsername,
} from "./server/validate";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ALLOWED_IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "image/avif",
  "image/svg+xml",
  "image/x-icon",
  "image/vnd.microsoft.icon",
]);

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).slice(0, 12).replace(/[^.a-zA-Z0-9]/g, "");
      cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
    },
  }),
  limits: {
    fileSize: config.maxUploadBytes,
    files: 1,
    fields: 4,
  },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_IMAGE_TYPES.has(file.mimetype)) {
      cb(new Error("Only image files are allowed"));
      return;
    }
    cb(null, true);
  },
});

interface UserRow {
  id: number;
  username: string;
  password: string;
  role: Role;
}

const EDIT_ROLES: Role[] = ["admin", "editor"];

async function startServer() {
  const app = express();

  if (config.trustProxy) app.set("trust proxy", 1);
  app.disable("x-powered-by");

  app.use(securityHeaders);
  app.use(express.json({ limit: "1mb" }));

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", uptime: Math.round(process.uptime()) });
  });

  app.post("/api/auth/login", loginRateLimit, (req, res) => {
    const { username, password } = req.body ?? {};

    if (typeof username !== "string" || typeof password !== "string") {
      res.locals.registerFailedLogin?.();
      return res.status(400).json({ error: "Username and password are required" });
    }

    const user = db
      .prepare("SELECT * FROM users WHERE username = ?")
      .get(username.trim()) as UserRow | undefined;

    const valid = user ? bcrypt.compareSync(password, user.password) : false;

    if (!user || !valid) {
      res.locals.registerFailedLogin?.();
      return res.status(401).json({ error: "Invalid credentials" });
    }

    res.locals.clearFailedLogins?.();

    const session: Session = { id: user.id, username: user.username, role: user.role };
    const token = signToken(session);
    setAuthCookie(res, token);

    res.json({ token, user: session });
  });

  app.post("/api/auth/logout", (_req, res) => {
    clearAuthCookie(res);
    res.json({ success: true });
  });

  app.get("/api/auth/me", authenticate, (req, res) => {
    res.json(req.user);
  });

  app.put("/api/auth/password", authenticate, (req, res) => {
    const { currentPassword, newPassword } = req.body ?? {};
    const userId = req.user!.id;

    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId) as
      | UserRow
      | undefined;

    if (!user) return res.status(404).json({ error: "User not found" });

    if (!bcrypt.compareSync(String(currentPassword ?? ""), user.password)) {
      return res.status(401).json({ error: "Current password is incorrect" });
    }

    const checked = validatePassword(newPassword);
    if (!checked.ok) return res.status(400).json({ error: checked.error });

    db.prepare("UPDATE users SET password = ? WHERE id = ?").run(
      bcrypt.hashSync(checked.value, 10),
      userId
    );

    res.json({ success: true });
  });

  app.get("/api/users", authenticate, requireRole(["admin"]), (_req, res) => {
    res.json(db.prepare("SELECT id, username, role FROM users ORDER BY id").all());
  });

  app.post("/api/users", authenticate, requireRole(["admin"]), (req, res) => {
    const { username, password, role } = req.body ?? {};

    const validName = validateUsername(username);
    if (!validName.ok) return res.status(400).json({ error: validName.error });

    const validPassword = validatePassword(password);
    if (!validPassword.ok) return res.status(400).json({ error: validPassword.error });

    if (role !== undefined && !isRole(role)) {
      return res.status(400).json({ error: "Invalid role" });
    }

    const userRole: Role = isRole(role) ? role : "viewer";

    try {
      const info = db
        .prepare("INSERT INTO users (username, password, role) VALUES (?, ?, ?)")
        .run(validName.value, bcrypt.hashSync(validPassword.value, 10), userRole);
      res.status(201).json({
        id: info.lastInsertRowid,
        username: validName.value,
        role: userRole,
      });
    } catch {
      res.status(400).json({ error: "Username already exists" });
    }
  });

  app.put("/api/users/:id", authenticate, requireRole(["admin"]), (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid user id" });

    const { password, role } = req.body ?? {};
    const target = db.prepare("SELECT * FROM users WHERE id = ?").get(id) as
      | UserRow
      | undefined;

    if (!target) return res.status(404).json({ error: "User not found" });

    const updates: string[] = [];
    const values: unknown[] = [];

    if (password !== undefined && password !== "") {
      const validPassword = validatePassword(password);
      if (!validPassword.ok) return res.status(400).json({ error: validPassword.error });
      updates.push("password = ?");
      values.push(bcrypt.hashSync(validPassword.value, 10));
    }

    if (role !== undefined) {
      if (!isRole(role)) return res.status(400).json({ error: "Invalid role" });
      if (target.role === "admin" && role !== "admin" && countAdmins() <= 1) {
        return res
          .status(400)
          .json({ error: "Cannot demote the last admin. Promote another user first." });
      }
      updates.push("role = ?");
      values.push(role);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: "Nothing to update" });
    }

    values.push(id);
    db.prepare(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`).run(...values);

    res.json({ success: true });
  });

  app.delete("/api/users/:id", authenticate, requireRole(["admin"]), (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid user id" });

    const target = db.prepare("SELECT * FROM users WHERE id = ?").get(id) as
      | UserRow
      | undefined;

    if (!target) return res.status(404).json({ error: "User not found" });

    const total = db.prepare("SELECT COUNT(*) AS count FROM users").get() as { count: number };
    if (total.count <= 1) {
      return res.status(400).json({ error: "Cannot delete the last user" });
    }

    if (target.role === "admin" && countAdmins() <= 1) {
      return res.status(400).json({ error: "Cannot delete the last admin" });
    }

    db.prepare("DELETE FROM users WHERE id = ?").run(id);
    res.json({ success: true });
  });

  app.get("/api/categories", authenticate, (_req, res) => {
    res.json(db.prepare("SELECT * FROM categories ORDER BY name").all());
  });

  app.post("/api/categories", authenticate, requireRole(EDIT_ROLES), (req, res) => {
    const { name, color, icon } = req.body ?? {};

    if (typeof name !== "string" || name.trim().length === 0) {
      return res.status(400).json({ error: "Category name is required" });
    }
    if (name.trim().length > 64) {
      return res.status(400).json({ error: "Category name must be 64 characters or fewer" });
    }

    const safeColor =
      typeof color === "string" && /^#[0-9a-fA-F]{6}$/.test(color) ? color : "#4f46e5";

    try {
      const info = db
        .prepare("INSERT INTO categories (name, color, icon) VALUES (?, ?, ?)")
        .run(name.trim(), safeColor, normalizeIconUrl(icon));
      res.status(201).json({
        id: info.lastInsertRowid,
        name: name.trim(),
        color: safeColor,
        icon: normalizeIconUrl(icon),
      });
    } catch {
      res.status(400).json({ error: "Category already exists" });
    }
  });

  app.put("/api/categories/:id", authenticate, requireRole(EDIT_ROLES), (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid category id" });

    const { name, color, icon } = req.body ?? {};
    const updates: string[] = [];
    const values: unknown[] = [];

    if (name !== undefined) {
      if (typeof name !== "string" || name.trim().length === 0) {
        return res.status(400).json({ error: "Category name cannot be empty" });
      }
      if (name.trim().length > 64) {
        return res.status(400).json({ error: "Category name must be 64 characters or fewer" });
      }
      updates.push("name = ?");
      values.push(name.trim());
    }

    if (color !== undefined) {
      if (typeof color !== "string" || !/^#[0-9a-fA-F]{6}$/.test(color)) {
        return res.status(400).json({ error: "Color must be a hex value like #4f46e5" });
      }
      updates.push("color = ?");
      values.push(color);
    }

    if (icon !== undefined) {
      updates.push("icon = ?");
      values.push(normalizeIconUrl(icon));
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: "Nothing to update" });
    }

    try {
      values.push(id);
      const result = db
        .prepare(`UPDATE categories SET ${updates.join(", ")} WHERE id = ?`)
        .run(...values);
      if (result.changes === 0) return res.status(404).json({ error: "Category not found" });
      res.json({ success: true });
    } catch {
      res.status(400).json({ error: "Category name already exists" });
    }
  });

  app.delete("/api/categories/:id", authenticate, requireRole(EDIT_ROLES), (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid category id" });
    db.prepare("DELETE FROM categories WHERE id = ?").run(id);
    res.json({ success: true });
  });

  app.get("/api/links", authenticate, (_req, res) => {
    res.json(
      db
        .prepare(
          `SELECT l.*, c.name AS category_name, c.color AS category_color
           FROM links l
           LEFT JOIN categories c ON c.id = l.category_id
           ORDER BY l.is_favorite DESC, l.sort_order ASC, l.title ASC`
        )
        .all()
    );
  });

  app.post("/api/links", authenticate, requireRole(EDIT_ROLES), (req, res) => {
    const { title, url, icon, category_id } = req.body ?? {};

    if (typeof title !== "string" || title.trim().length === 0) {
      return res.status(400).json({ error: "Title is required" });
    }
    if (title.trim().length > 120) {
      return res.status(400).json({ error: "Title must be 120 characters or fewer" });
    }

    const validUrl = normalizeLinkUrl(url);
    if (!validUrl.ok) return res.status(400).json({ error: validUrl.error });

    let category: number | null = null;
    if (category_id !== null && category_id !== undefined && category_id !== "") {
      const parsedId = parseInt(String(category_id), 10);
      if (Number.isNaN(parsedId)) {
        return res.status(400).json({ error: "Invalid category" });
      }
      const exists = db.prepare("SELECT id FROM categories WHERE id = ?").get(parsedId);
      if (!exists) return res.status(400).json({ error: "Invalid category" });
      category = parsedId;
    }

    const info = db
      .prepare("INSERT INTO links (title, url, icon, category_id) VALUES (?, ?, ?, ?)")
      .run(title.trim(), validUrl.value, normalizeIconUrl(icon), category);

    res.status(201).json({
      id: info.lastInsertRowid,
      title: title.trim(),
      url: validUrl.value,
      icon: normalizeIconUrl(icon),
      category_id: category,
    });
  });

  app.put("/api/links/:id", authenticate, requireRole(EDIT_ROLES), (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid link id" });

    const existing = db.prepare("SELECT * FROM links WHERE id = ?").get(id) as
      | { id: number }
      | undefined;
    if (!existing) return res.status(404).json({ error: "Link not found" });

    const { title, url, icon, category_id, is_favorite } = req.body ?? {};
    const updates: string[] = [];
    const values: unknown[] = [];

    if (title !== undefined) {
      if (typeof title !== "string" || title.trim().length === 0) {
        return res.status(400).json({ error: "Title cannot be empty" });
      }
      if (title.trim().length > 120) {
        return res.status(400).json({ error: "Title must be 120 characters or fewer" });
      }
      updates.push("title = ?");
      values.push(title.trim());
    }

    if (url !== undefined) {
      const validUrl = normalizeLinkUrl(url);
      if (!validUrl.ok) return res.status(400).json({ error: validUrl.error });
      updates.push("url = ?");
      values.push(validUrl.value);
    }

    if (icon !== undefined) {
      updates.push("icon = ?");
      values.push(normalizeIconUrl(icon));
    }

    if (category_id !== undefined) {
      if (category_id === null || category_id === "") {
        updates.push("category_id = ?");
        values.push(null);
      } else {
        const parsedId = parseInt(String(category_id), 10);
        if (Number.isNaN(parsedId)) {
          return res.status(400).json({ error: "Invalid category" });
        }
        const exists = db.prepare("SELECT id FROM categories WHERE id = ?").get(parsedId);
        if (!exists) return res.status(400).json({ error: "Invalid category" });
        updates.push("category_id = ?");
        values.push(parsedId);
      }
    }

    if (is_favorite !== undefined) {
      updates.push("is_favorite = ?");
      values.push(is_favorite ? 1 : 0);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: "Nothing to update" });
    }

    values.push(id);
    db.prepare(`UPDATE links SET ${updates.join(", ")} WHERE id = ?`).run(...values);

    res.json({ success: true });
  });

  app.delete("/api/links/:id", authenticate, requireRole(EDIT_ROLES), (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid link id" });
    db.prepare("DELETE FROM links WHERE id = ?").run(id);
    res.json({ success: true });
  });

  app.post(
    "/api/upload",
    authenticate,
    requireRole(EDIT_ROLES),
    (req, res, next) => {
      upload.single("file")(req, res, (err: unknown) => {
        if (!err) return next();
        const message = err instanceof Error ? err.message : "Upload failed";
        if (message.includes("File too large")) {
          return res.status(413).json({
            error: `File too large. Maximum size is ${Math.round(
              config.maxUploadBytes / (1024 * 1024)
            )}MB.`,
          });
        }
        if (message.includes("Only image files")) {
          return res.status(415).json({ error: "Only image files are allowed" });
        }
        return res.status(400).json({ error: "Upload failed" });
      });
    },
    (req, res) => {
      if (!req.file) return res.status(400).json({ error: "No file uploaded" });
      res.status(201).json({ url: `/uploads/${req.file.filename}` });
    }
  );

  app.get("/api/uploads", authenticate, requireRole(EDIT_ROLES), (_req, res) => {
    const referenced = new Set<string>();

    for (const row of db.prepare("SELECT icon FROM links WHERE icon LIKE '/uploads/%'").all() as {
      icon: string;
    }[]) {
      referenced.add(row.icon.replace("/uploads/", ""));
    }

    for (const row of db
      .prepare("SELECT icon FROM categories WHERE icon LIKE '/uploads/%'")
      .all() as { icon: string }[]) {
      referenced.add(row.icon.replace("/uploads/", ""));
    }

    const files = fs
      .readdirSync(uploadsDir, { withFileTypes: true })
      .filter((entry) => entry.isFile())
      .map((entry) => {
        const stats = fs.statSync(path.join(uploadsDir, entry.name));
        return {
          name: entry.name,
          size: stats.size,
          modified: stats.mtime.toISOString(),
          inUse: referenced.has(entry.name),
        };
      })
      .sort((a, b) => b.modified.localeCompare(a.modified));

    res.json(files);
  });

  app.delete("/api/uploads/:name", authenticate, requireRole(EDIT_ROLES), (req, res) => {
    const { name } = req.params;

    if (!isSafeUploadName(name)) {
      return res.status(400).json({ error: "Invalid filename" });
    }

    const inUse = db
      .prepare("SELECT 1 FROM links WHERE icon = ? UNION SELECT 1 FROM categories WHERE icon = ?")
      .get(`/uploads/${name}`, `/uploads/${name}`);

    if (inUse) {
      return res.status(409).json({ error: "This file is still used by a link or category" });
    }

    const target = path.join(uploadsDir, name);
    if (!target.startsWith(uploadsDir + path.sep)) {
      return res.status(400).json({ error: "Invalid filename" });
    }

    if (!fs.existsSync(target)) {
      return res.status(404).json({ error: "File not found" });
    }

    fs.unlinkSync(target);
    res.json({ success: true });
  });

  app.use(
    "/uploads",
    authenticate,
    (_req: Request, res: Response, next: NextFunction) => {
      res.setHeader(
        "Content-Security-Policy",
        "default-src 'none'; style-src 'unsafe-inline'; sandbox"
      );
      next();
    },
    express.static(uploadsDir, {
      index: false,
      dotfiles: "deny",
      maxAge: "7d",
      setHeaders: (res) => res.setHeader("X-Content-Type-Options", "nosniff"),
    })
  );

  app.use("/api", (_req, res) => {
    res.status(404).json({ error: "Not found" });
  });

  if (!config.isProduction) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.join(__dirname, "dist");
    app.use(
      express.static(distDir, {
        index: false,
        setHeaders: (res, filePath) => {
          if (filePath.includes(`${path.sep}assets${path.sep}`)) {
            res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
          } else {
            res.setHeader("Cache-Control", "no-cache");
          }
        },
      })
    );
    app.get("*", (_req, res) => {
      res.setHeader("Cache-Control", "no-cache");
      res.sendFile(path.join(distDir, "index.html"));
    });
  }

  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error("[nexus] unhandled error:", err);
    if (res.headersSent) return;
    res.status(500).json({ error: "Internal server error" });
  });

  const server = app.listen(config.port, "0.0.0.0", () => {
    console.log(`[nexus] server listening on 0.0.0.0:${config.port}`);
    console.log(`[nexus] data directory: ${dataDir}`);
  });

  const shutdown = (signal: string) => {
    console.log(`[nexus] ${signal} received, shutting down`);
    server.close(() => {
      closeDatabase();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

startServer().catch((err) => {
  console.error("[nexus] failed to start:", err);
  process.exit(1);
});
