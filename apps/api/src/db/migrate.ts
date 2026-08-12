import { migrate } from "drizzle-orm/postgres-js/migrator";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { closeDatabase, db } from "./client.js";

try {
  const migrationsFolder = resolve(
    dirname(fileURLToPath(import.meta.url)),
    "../../drizzle",
  );
  await migrate(db, { migrationsFolder });
  console.log("Database migrations applied.");
} finally {
  await closeDatabase();
}
