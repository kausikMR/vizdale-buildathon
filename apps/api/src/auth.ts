import { eq } from "drizzle-orm";
import type { RequestHandler } from "express";

import { db } from "./db/client.js";
import { users } from "./db/schema.js";
import { AppError } from "./errors.js";

export type AuthenticatedUser = Pick<
  typeof users.$inferSelect,
  "id" | "name" | "role" | "status"
>;

declare global {
  namespace Express {
    interface Locals {
      user: AuthenticatedUser;
    }
  }
}

export const requireUser: RequestHandler = async (req, res, next) => {
  const userId = req.header("x-user-id")?.trim();
  if (
    !userId ||
    !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(userId)
  ) {
    next(
      new AppError(
        403,
        "NOT_SIGNED_IN",
        "Choose a demo account before continuing.",
      ),
    );
    return;
  }

  const [user] = await db
    .select({
      id: users.id,
      name: users.name,
      role: users.role,
      status: users.status,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user || user.status !== "active") {
    next(
      new AppError(
        403,
        "NOT_SIGNED_IN",
        "That demo account is unavailable. Choose another account and try again.",
      ),
    );
    return;
  }

  res.locals.user = user;
  next();
};

export const requireAdmin: RequestHandler = (_req, res, next) => {
  if (res.locals.user.role !== "admin") {
    next(
      new AppError(
        403,
        "ADMIN_ONLY",
        "Only an administrator can manage prasadam items and inventory.",
      ),
    );
    return;
  }

  next();
};
