import { inArray } from "drizzle-orm";

import { closeDatabase, db } from "./client.js";
import { inventoryMovements, prasadamItems, users } from "./schema.js";

const ADMIN_ID = "11111111-1111-1111-1111-111111111111";

const demoUsers: Array<typeof users.$inferInsert> = [
  {
    id: ADMIN_ID,
    name: "Priya Raman",
    role: "admin",
    status: "active",
  },
  {
    id: "22222222-2222-2222-2222-222222222222",
    name: "Arjun Iyer",
    role: "devotee",
    status: "active",
  },
  {
    id: "33333333-3333-3333-3333-333333333333",
    name: "Lakshmi Nair",
    role: "devotee",
    status: "active",
  },
];

const demoPrasadam: Array<typeof prasadamItems.$inferInsert> = [
  {
    id: "44444444-4444-4444-8444-444444444441",
    name: "Laddu",
    description: "Traditional temple laddu prasadam",
    displayPrice: "25.00",
    stock: 120,
    reorderLevel: 30,
    active: true,
  },
  {
    id: "44444444-4444-4444-8444-444444444442",
    name: "Panchamrutham",
    description: "Sacred five-ingredient offering",
    displayPrice: "40.00",
    stock: 40,
    reorderLevel: 15,
    active: true,
  },
  {
    id: "44444444-4444-4444-8444-444444444443",
    name: "Kumkum",
    description: "Blessed kumkum packet",
    displayPrice: "10.00",
    stock: 200,
    reorderLevel: 50,
    active: true,
  },
  {
    id: "44444444-4444-4444-8444-444444444444",
    name: "Tulsi Garland",
    description: "Fresh tulsi garland",
    displayPrice: "50.00",
    stock: 12,
    reorderLevel: 20,
    active: true,
  },
  {
    id: "44444444-4444-4444-8444-444444444445",
    name: "Vibhuti",
    description: "Blessed sacred ash packet",
    displayPrice: "10.00",
    stock: 0,
    reorderLevel: 25,
    active: true,
  },
  {
    id: "44444444-4444-4444-8444-444444444446",
    name: "Festival Hamper",
    description: "Seasonal prasadam assortment",
    displayPrice: "150.00",
    stock: 10,
    reorderLevel: 5,
    active: false,
  },
];

try {
  await db.transaction(async (tx) => {
    await tx.insert(users).values(demoUsers).onConflictDoNothing();

    const existingItems = await tx
      .select({ name: prasadamItems.name })
      .from(prasadamItems)
      .where(
        inArray(
          prasadamItems.name,
          demoPrasadam.map((item) => item.name),
        ),
      );
    const existingNames = new Set(existingItems.map((item) => item.name));
    const missingItems = demoPrasadam.filter(
      (item) => !existingNames.has(item.name),
    );
    const insertedItems =
      missingItems.length === 0
        ? []
        : await tx
            .insert(prasadamItems)
            .values(missingItems)
            .onConflictDoNothing()
            .returning({ id: prasadamItems.id, stock: prasadamItems.stock });

    const initialMovements: Array<typeof inventoryMovements.$inferInsert> =
      insertedItems
        .filter((item) => item.stock > 0)
        .map((item) => ({
          itemId: item.id,
          type: "restock",
          quantity: item.stock,
          reason: "Initial demo stock",
          createdBy: ADMIN_ID,
        }));

    if (initialMovements.length > 0) {
      await tx.insert(inventoryMovements).values(initialMovements);
    }
  });

  console.log("Demo users and prasadam data are ready.");
} finally {
  await closeDatabase();
}
