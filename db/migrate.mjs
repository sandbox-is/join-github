// Applies the files in db/migrations, in order, each exactly once. Used by the
// local database (lib/db.ts) and by the build on Vercel (scripts/migrate.mjs).
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const DIR = join(process.cwd(), "db", "migrations");

export function migrationFiles() {
  const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
  for (const f of files) {
    if (!/^\d{3}_[a-z0-9_]+\.sql$/.test(f)) {
      throw new Error(`Migration files are named like 002_add_dinners.sql, not "${f}".`);
    }
  }
  return files;
}

// Any fixed number: every runner takes the same lock, so two builds (or two
// requests on a computer) can't apply the same migration at once.
const LOCK = 7265110;

// db.exec runs a script of statements; db.query runs one and returns its rows.
// Both must use one connection, since the lock belongs to the connection.
export async function migrate(db) {
  await db.exec(`select pg_advisory_lock(${LOCK})`);
  try {
    await applyPending(db);
  } finally {
    await db.exec(`select pg_advisory_unlock(${LOCK})`);
  }
}

async function applyPending(db) {
  await db.exec(
    "create table if not exists _migrations (name text primary key, applied_at timestamptz not null default now())",
  );
  const done = new Set((await db.query("select name from _migrations")).map((r) => r.name));
  for (const file of migrationFiles()) {
    if (done.has(file)) continue;
    const text = readFileSync(join(DIR, file), "utf8");
    try {
      await db.exec(`begin;\n${text}\n;\ninsert into _migrations (name) values ('${file}');\ncommit;`);
    } catch (error) {
      await db.exec("rollback");
      throw new Error(`Database change ${file} failed: ${error.message}`);
    }
    console.log(`Database: applied ${file}`);
  }
}
