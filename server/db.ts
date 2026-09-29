import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const dataDir = path.join(__dirname, "..", "data");
export const uploadsDir = path.join(dataDir, "uploads");

fs.mkdirSync(uploadsDir, { recursive: true });

const db = new Database(path.join(dataDir, "database.sqlite"));
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

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

function addColumn(table: string, column: string, definition: string) {
  try {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  } catch {
    // column already exists
  }
}

addColumn("categories", "icon", "TEXT");
addColumn("users", "role", "TEXT DEFAULT 'viewer'");
addColumn("links", "is_favorite", "INTEGER NOT NULL DEFAULT 0");
addColumn("links", "sort_order", "INTEGER NOT NULL DEFAULT 0");

db.exec("CREATE INDEX IF NOT EXISTS idx_links_category ON links(category_id)");
db.exec("CREATE INDEX IF NOT EXISTS idx_links_favorite ON links(is_favorite)");

const adminUser = db
  .prepare("SELECT * FROM users WHERE username = 'admin'")
  .get() as { id: number } | undefined;

if (!adminUser) {
  const hash = bcrypt.hashSync("admin", 10);
  db.prepare(
    "INSERT INTO users (username, password, role) VALUES (?, ?, ?)"
  ).run("admin", hash, "admin");
  console.warn(
    "[nexus] Seeded default admin user with username 'admin' and password 'admin'. Change it immediately via Settings > Change password."
  );
} else {
  db.prepare("UPDATE users SET role = 'admin' WHERE username = 'admin'").run();
}

export function countAdmins(): number {
  const row = db.prepare("SELECT COUNT(*) AS count FROM users WHERE role = 'admin'").get() as {
    count: number;
  };
  return row.count;
}

export function closeDatabase() {
  try {
    db.pragma("wal_checkpoint(TRUNCATE)");
  } catch {
    // best effort
  }
  db.close();
}

export default db;
