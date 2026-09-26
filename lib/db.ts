import { mkdirSync } from "node:fs";
import { neon } from "@neondatabase/serverless";
import type { PGlite } from "@electric-sql/pglite";
import { migrate, migrationFiles } from "@/db/migrate.mjs";

// One database API for everywhere:
//
//   const rows = await sql`select * from members where sub = ${member.sub}`;
//
// Online it's the Neon database (DATABASE_URL). On your computer it's a local
// Postgres kept in .data/, so nothing needs setting up and live data is never
// touched. Values in ${} are always sent safely, never pasted into the SQL.

type Row = Record<string, unknown>;

export function hasDatabase() {
  return Boolean(process.env.DATABASE_URL) || process.env.NODE_ENV === "development";
}

const local = globalThis as unknown as { pglite?: Promise<PGlite>; migrating?: Promise<void>; migrated?: string };

async function localDatabase() {
  local.pglite ??= (async () => {
    const { PGlite } = await import("@electric-sql/pglite");
    mkdirSync(".data", { recursive: true });
    return new PGlite(".data/pglite");
  })();
  const pg = await local.pglite;
  // Re-check on every call so a new migration file applies without a restart.
  // Requests arriving together wait for the same run rather than starting their own.
  const files = migrationFiles().join();
  if (local.migrated !== files) {
    local.migrating ??= migrate({
      exec: async (text: string) => void (await pg.exec(text)),
      query: async (text: string) => (await pg.query(text)).rows,
    })
      .then(() => {
        local.migrated = files;
      })
      .finally(() => {
        local.migrating = undefined;
      });
    await local.migrating;
  }
  return pg;
}

export async function sql<T = Row>(strings: TemplateStringsArray, ...values: unknown[]): Promise<T[]> {
  if (process.env.DATABASE_URL) {
    return (await neon(process.env.DATABASE_URL)(strings, ...values)) as T[];
  }
  if (process.env.NODE_ENV === "development") {
    return (await (await localDatabase()).sql<T>(strings, ...values)).rows;
  }
  throw new Error("This app has no database yet. Run  npm run online  to add one.");
}
