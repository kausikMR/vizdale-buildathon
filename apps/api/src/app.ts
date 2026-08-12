import cors from "cors";
import express from "express";
import { sql } from "drizzle-orm";

import { db } from "./db/client.js";
import { errorHandler } from "./errors.js";
import { prasadamRouter } from "./prasadam/router.js";

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: "100kb" }));

  app.get("/api/health", async (_req, res) => {
    await db.execute(sql`select 1`);
    res.json({ status: "ok", service: "api", database: "connected" });
  });

  app.use("/api/prasadam", prasadamRouter);

  app.use((_req, res) => {
    res.status(404).json({
      error: {
        code: "NOT_FOUND",
        message: "That API endpoint could not be found.",
      },
    });
  });

  app.use(errorHandler);
  return app;
}
