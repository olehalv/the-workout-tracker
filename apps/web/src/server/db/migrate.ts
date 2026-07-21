import "dotenv/config";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db, pool } from "./client";

async function main(): Promise<void> {
  await migrate(db, { migrationsFolder: "drizzle" });
  console.log("[web] migrations applied");
  await pool.end();
}

main().catch((err) => {
  console.error("[web] migration failed:", err);
  process.exit(1);
});
