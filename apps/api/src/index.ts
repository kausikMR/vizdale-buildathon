import express from "express";
import cors from "cors";
import { ensureDemoPasswords } from "./auth/demoAccounts.js";
import { deleteExpiredSessions } from "./data/sessions.js";
import { initDb } from "./db/index.js";
import { errorHandler } from "./errors.js";
import { attachUser } from "./middleware.js";
import { authRouter } from "./routes/auth.js";

const app = express();
const PORT = Number(process.env.PORT ?? 4000);

app.use(cors());
app.use(express.json());
app.use(attachUser);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "api" });
});

app.use("/api", authRouter);

app.use(errorHandler);

// Schema and seed are applied before the port opens, so the first request never
// races the migration.
const db = await initDb();
await ensureDemoPasswords();
await deleteExpiredSessions();
console.log(
  `Database ready (${db.driver}${db.driver === "pglite" ? " — set DATABASE_URL to use Postgres" : ""})`,
);

app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});
