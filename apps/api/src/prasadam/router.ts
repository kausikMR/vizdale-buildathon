import { Router } from "express";

import { requireAdmin, requireUser } from "../auth.js";
import {
  adjustPrasadamStock,
  createPrasadam,
  listPrasadam,
  updatePrasadam,
} from "./repository.js";
import {
  parseAdjustStock,
  parseCreatePrasadam,
  parseUpdatePrasadam,
  validateUuid,
} from "./validation.js";

export const prasadamRouter = Router();

prasadamRouter.use(requireUser);

prasadamRouter.get("/", async (_req, res) => {
  const items = await listPrasadam(res.locals.user.role === "admin");
  res.json(items);
});

prasadamRouter.post("/", requireAdmin, async (req, res) => {
  const item = await createPrasadam(
    parseCreatePrasadam(req.body),
    res.locals.user.id,
  );
  res.status(201).json(item);
});

prasadamRouter.patch("/:id", requireAdmin, async (req, res) => {
  const item = await updatePrasadam(
    validateUuid(req.params.id),
    parseUpdatePrasadam(req.body),
  );
  res.json(item);
});

prasadamRouter.post("/:id/adjust", requireAdmin, async (req, res) => {
  const item = await adjustPrasadamStock(
    validateUuid(req.params.id),
    parseAdjustStock(req.body),
    res.locals.user.id,
  );
  res.json(item);
});
