import { config as loadEnv } from "dotenv";
import { defineConfig } from "drizzle-kit";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const apiRoot = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: resolve(apiRoot, ".env"), quiet: true });

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required in apps/api/.env");
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  strict: true,
  verbose: true,
});
