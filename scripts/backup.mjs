import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

const source = process.env.NEXUS_DB || "/app/data/database.sqlite";
const backupDir = process.env.NEXUS_BACKUP_DIR || "/app/data/backups";
const retainDays = parseInt(process.env.NEXUS_BACKUP_RETAIN_DAYS || "14", 10);

if (!fs.existsSync(source)) {
  console.error(`[backup] no database at ${source}`);
  process.exit(1);
}

fs.mkdirSync(backupDir, { recursive: true });

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const target = path.join(backupDir, `database-${stamp}.sqlite`);

const db = new Database(source, { readonly: true, fileMustExist: true });

try {
  await db.backup(target);
  const { size } = fs.statSync(target);
  console.log(`[backup] wrote ${target} (${size} bytes)`);
} catch (err) {
  console.error("[backup] failed:", err);
  process.exit(1);
} finally {
  db.close();
}

const cutoff = Date.now() - retainDays * 24 * 60 * 60 * 1000;
let removed = 0;

for (const entry of fs.readdirSync(backupDir)) {
  if (!entry.startsWith("database-") || !entry.endsWith(".sqlite")) continue;
  const file = path.join(backupDir, entry);
  if (fs.statSync(file).mtimeMs < cutoff) {
    fs.unlinkSync(file);
    removed += 1;
  }
}

if (removed > 0) {
  console.log(`[backup] pruned ${removed} backup(s) older than ${retainDays} days`);
}
