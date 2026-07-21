import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { config } from "../config";
import * as schema from "./schema";

// Reuse a single pool across Next dev HMR reloads so we don't exhaust Postgres
// connections. In production each server instance creates its own pool once.
const globalForDb = globalThis as unknown as { __pgPool?: Pool };

export const pool = globalForDb.__pgPool ?? new Pool({ connectionString: config.databaseUrl });
if (process.env.NODE_ENV !== "production") {
  globalForDb.__pgPool = pool;
}

export const db = drizzle(pool, { schema });
