import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { env } from "../config.js";
import * as schema from "./schema.js";

export const queryClient = postgres(env.DATABASE_URL, {
  max: 10,
  prepare: false,
});

export const db = drizzle({ client: queryClient, schema });

export async function closeDatabase(): Promise<void> {
  await queryClient.end();
}
