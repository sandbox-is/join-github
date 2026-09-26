// Runs before `next build`. On Vercel's production build it brings the live
// database up to date with db/migrations; everywhere else there's nothing to do
// (the local database updates itself when the app uses it).
import { Pool } from "@neondatabase/serverless";
import { migrate } from "../db/migrate.mjs";

const url = process.env.DATABASE_URL;
if (!url) {
  console.log("Database: no DATABASE_URL, skipping migrations.");
} else if (process.env.VERCEL && process.env.VERCEL_ENV !== "production") {
  console.log("Database: preview build, skipping migrations so the live database isn't changed.");
} else {
  const pool = new Pool({ connectionString: url });
  const client = await pool.connect();
  try {
    await migrate({
      exec: (text) => client.query(text),
      query: async (text) => (await client.query(text)).rows,
    });
  } finally {
    client.release();
    await pool.end();
  }
}
