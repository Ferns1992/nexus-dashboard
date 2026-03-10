import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import multer from "multer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.join(__dirname, "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const uploadsDir = path.join(dataDir, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

const db = new Database(path.join(dataDir, "database.sqlite"));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    role TEXT DEFAULT 'viewer'
  );

  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE,
    color TEXT,
    icon TEXT
  );

  CREATE TABLE IF NOT EXISTS links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    url TEXT,
    icon TEXT,
    category_id INTEGER,
    FOREIGN KEY(category_id) REFERENCES categories(id) ON DELETE SET NULL
  );
`);

// Add icon column to categories if it doesn't exist
try {
  db.exec("ALTER TABLE categories ADD COLUMN icon TEXT");
} catch (e) {
  // Column likely already exists
}

// Add role column to users if it doesn't exist
try {
  db.exec("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'viewer'");
} catch (e) {
  // Column likely already exists
}

// Create default admin user if none exists
const adminUser = db.prepare("SELECT * FROM users WHERE username = 'admin'").get();
if (!adminUser) {
  const hash = bcrypt.hashSync("admin", 10);
  db.prepare("INSERT INTO users (username, password, role) VALUES (?, ?, ?)").run("admin", hash, "admin");
} else {
  // Ensure the admin user has the admin role if it was created before the role column
  db.prepare("UPDATE users SET role = 'admin' WHERE username = 'admin'").run();
}

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key-change-me";

const authenticate = (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
};

const requireRole = (roles: string[]) => {
  return (req: any, res: any, next: any) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Forbidden: insufficient permissions" });
    }
    next();
  };
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use("/uploads", express.static(uploadsDir));

  // Upload API
  app.post("/api/upload", authenticate, requireRole(['admin', 'editor']), upload.single("file"), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    res.json({ url: `/uploads/${req.file.filename}` });
  });

  // API Routes
  app.post("/api/auth/login", (req, res) => {
    const { username, password } = req.body;
    const user: any = db.prepare("SELECT * FROM users WHERE username = ?").get(username);

    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
    res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
  });

  app.get("/api/auth/me", authenticate, (req: any, res) => {
    res.json(req.user);
  });

  app.get("/api/users", authenticate, requireRole(['admin']), (req, res) => {
    const users = db.prepare("SELECT id, username, role FROM users").all();
    res.json(users);
  });

  app.post("/api/users", authenticate, requireRole(['admin']), (req, res) => {
    const { username, password, role } = req.body;
    try {
      const hash = bcrypt.hashSync(password, 10);
      const userRole = role || 'viewer';
      const info = db.prepare("INSERT INTO users (username, password, role) VALUES (?, ?, ?)").run(username, hash, userRole);
      res.json({ id: info.lastInsertRowid, username, role: userRole });
    } catch (err) {
      res.status(400).json({ error: "Username already exists" });
    }
  });

  app.put("/api/users/:id", authenticate, requireRole(['admin']), (req, res) => {
    const id = parseInt(req.params.id, 10);
    const { password, role } = req.body;
    
    try {
      if (password) {
        const hash = bcrypt.hashSync(password, 10);
        db.prepare("UPDATE users SET password = ? WHERE id = ?").run(hash, id);
      }
      if (role) {
        db.prepare("UPDATE users SET role = ? WHERE id = ?").run(role, id);
      }
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to update user" });
    }
  });

  app.delete("/api/users/:id", authenticate, requireRole(['admin']), (req, res) => {
    const id = parseInt(req.params.id, 10);
    const userCount: any = db.prepare("SELECT COUNT(*) as count FROM users").get();
    if (userCount.count <= 1) {
      return res.status(400).json({ error: "Cannot delete the last user" });
    }
    db.prepare("DELETE FROM users WHERE id = ?").run(id);
    res.json({ success: true });
  });

  // Categories
  app.get("/api/categories", (req, res) => {
    const categories = db.prepare("SELECT * FROM categories").all();
    res.json(categories);
  });

  app.post("/api/categories", authenticate, requireRole(['admin', 'editor']), (req, res) => {
    const { name, color, icon } = req.body;
    try {
      const info = db.prepare("INSERT INTO categories (name, color, icon) VALUES (?, ?, ?)").run(name, color || "#4f46e5", icon || "");
      res.json({ id: info.lastInsertRowid, name, color: color || "#4f46e5", icon: icon || "" });
    } catch (err) {
      res.status(400).json({ error: "Category already exists" });
    }
  });

  app.delete("/api/categories/:id", authenticate, requireRole(['admin', 'editor']), (req, res) => {
    const id = parseInt(req.params.id, 10);
    db.prepare("DELETE FROM categories WHERE id = ?").run(id);
    res.json({ success: true });
  });

  // Links
  app.get("/api/links", (req, res) => {
    const links = db.prepare("SELECT * FROM links").all();
    res.json(links);
  });

  app.post("/api/links", authenticate, requireRole(['admin', 'editor']), (req, res) => {
    const { title, url, icon, category_id } = req.body;
    const info = db.prepare("INSERT INTO links (title, url, icon, category_id) VALUES (?, ?, ?, ?)").run(title, url, icon || "", category_id || null);
    res.json({ id: info.lastInsertRowid, title, url, icon, category_id });
  });

  app.delete("/api/links/:id", authenticate, requireRole(['admin', 'editor']), (req, res) => {
    const id = parseInt(req.params.id, 10);
    db.prepare("DELETE FROM links WHERE id = ?").run(id);
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
