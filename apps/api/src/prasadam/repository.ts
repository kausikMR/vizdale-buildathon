import { and, asc, eq, sql } from "drizzle-orm";

import { db } from "../db/client.js";
import { inventoryMovements, prasadamItems } from "../db/schema.js";
import { AppError } from "../errors.js";
import type {
  AdjustStockInput,
  CreatePrasadamInput,
  UpdatePrasadamInput,
} from "./validation.js";

type PrasadamRow = typeof prasadamItems.$inferSelect;

export interface PrasadamView extends PrasadamRow {
  lowStock: boolean;
  reservable: boolean;
}

function toView(item: PrasadamRow): PrasadamView {
  return {
    ...item,
    lowStock: item.stock <= item.reorderLevel,
    reservable: item.active && item.stock > 0,
  };
}

export async function listPrasadam(isAdmin: boolean): Promise<PrasadamView[]> {
  const query = db.select().from(prasadamItems).orderBy(asc(prasadamItems.name));
  const rows = isAdmin
    ? await query
    : await query.where(eq(prasadamItems.active, true));
  return rows.map(toView);
}

export async function createPrasadam(
  input: CreatePrasadamInput,
  adminId: string,
): Promise<PrasadamView> {
  return db.transaction(async (tx) => {
    const [item] = await tx.insert(prasadamItems).values(input).returning();

    if (input.stock > 0) {
      await tx.insert(inventoryMovements).values({
        itemId: item.id,
        type: "restock",
        quantity: input.stock,
        reason: "Initial stock",
        createdBy: adminId,
      });
    }

    return toView(item);
  });
}

export async function updatePrasadam(
  id: string,
  input: UpdatePrasadamInput,
): Promise<PrasadamView> {
  const [item] = await db
    .update(prasadamItems)
    .set(input)
    .where(eq(prasadamItems.id, id))
    .returning();

  if (!item) {
    throw new AppError(404, "NOT_FOUND", "That prasadam item could not be found.");
  }
  return toView(item);
}

export async function adjustPrasadamStock(
  id: string,
  input: AdjustStockInput,
  adminId: string,
): Promise<PrasadamView> {
  return db.transaction(async (tx) => {
    const [item] = await tx
      .update(prasadamItems)
      .set({ stock: sql`${prasadamItems.stock} + ${input.delta}` })
      .where(
        and(
          eq(prasadamItems.id, id),
          sql`${prasadamItems.stock} + ${input.delta} >= 0`,
        ),
      )
      .returning();

    if (!item) {
      const [existing] = await tx
        .select({ stock: prasadamItems.stock })
        .from(prasadamItems)
        .where(eq(prasadamItems.id, id))
        .limit(1);

      if (!existing) {
        throw new AppError(404, "NOT_FOUND", "That prasadam item could not be found.");
      }
      throw new AppError(
        409,
        "STOCK_WOULD_GO_NEGATIVE",
        `This adjustment would make stock negative. The item currently has ${existing.stock} available.`,
      );
    }

    await tx.insert(inventoryMovements).values({
      itemId: id,
      type: input.delta > 0 ? "restock" : "adjust",
      quantity: input.delta,
      reason: input.reason,
      createdBy: adminId,
    });

    return toView(item);
  });
}
