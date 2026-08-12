import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import test from "node:test";
import { eq } from "drizzle-orm";

import { createApp } from "../src/app.js";
import { closeDatabase, db } from "../src/db/client.js";
import { inventoryMovements, prasadamItems } from "../src/db/schema.js";

const ADMIN_ID = "11111111-1111-1111-1111-111111111111";
const DEVOTEE_ID = "22222222-2222-2222-2222-222222222222";

interface PrasadamResponse {
  id: string;
  name: string;
  description: string;
  displayPrice: string | null;
  stock: number;
  reorderLevel: number;
  active: boolean;
  lowStock: boolean;
  reservable: boolean;
}

interface ErrorResponse {
  error: { code: string; message: string };
}

test("prasadam CRUD API and stock audit flow", async (t) => {
  const server = await new Promise<ReturnType<ReturnType<typeof createApp>["listen"]>>(
    (resolve) => {
      const listeningServer = createApp().listen(0, () => resolve(listeningServer));
    },
  );
  const address = server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${address.port}/api/prasadam`;
  let createdId: string | undefined;

  async function request(
    path = "",
    options: RequestInit = {},
    userId?: string,
  ): Promise<Response> {
    return fetch(`${baseUrl}${path}`, {
      ...options,
      headers: {
        ...(options.body ? { "content-type": "application/json" } : {}),
        ...(userId ? { "x-user-id": userId } : {}),
        ...options.headers,
      },
    });
  }

  try {
    await t.test("authentication and admin authorization are enforced", async () => {
      const anonymous = await request();
      assert.equal(anonymous.status, 403);
      assert.equal(((await anonymous.json()) as ErrorResponse).error.code, "NOT_SIGNED_IN");

      const malformed = await request("", {}, "not-a-uuid");
      assert.equal(malformed.status, 403);
      assert.equal(((await malformed.json()) as ErrorResponse).error.code, "NOT_SIGNED_IN");

      const devoteeCreate = await request(
        "",
        { method: "POST", body: JSON.stringify({ name: "Forbidden item" }) },
        DEVOTEE_ID,
      );
      assert.equal(devoteeCreate.status, 403);
      assert.equal(((await devoteeCreate.json()) as ErrorResponse).error.code, "ADMIN_ONLY");
    });

    await t.test("admin creates an inactive item with audited initial stock", async () => {
      const response = await request(
        "",
        {
          method: "POST",
          body: JSON.stringify({
            name: `E2E Prasadam ${Date.now()}`,
            description: "Created by the end-to-end API test",
            displayPrice: 12.5,
            stock: 5,
            reorderLevel: 10,
            active: false,
          }),
        },
        ADMIN_ID,
      );

      assert.equal(response.status, 201);
      const item = (await response.json()) as PrasadamResponse;
      createdId = item.id;
      assert.equal(item.displayPrice, "12.50");
      assert.equal(item.stock, 5);
      assert.equal(item.lowStock, true);
      assert.equal(item.reservable, false);

      const movements = await db
        .select()
        .from(inventoryMovements)
        .where(eq(inventoryMovements.itemId, item.id));
      assert.equal(movements.length, 1);
      assert.equal(movements[0].type, "restock");
      assert.equal(movements[0].quantity, 5);
    });

    await t.test("role-aware listing hides inactive items from devotees", async () => {
      assert.ok(createdId);
      const devoteeResponse = await request("", {}, DEVOTEE_ID);
      const devoteeItems = (await devoteeResponse.json()) as PrasadamResponse[];
      assert.equal(devoteeItems.some((item) => item.id === createdId), false);

      const adminResponse = await request("", {}, ADMIN_ID);
      const adminItems = (await adminResponse.json()) as PrasadamResponse[];
      assert.equal(adminItems.some((item) => item.id === createdId), true);
      for (const demoName of [
        "Laddu",
        "Panchamrutham",
        "Kumkum",
        "Tulsi Garland",
        "Vibhuti",
        "Festival Hamper",
      ]) {
        assert.equal(
          adminItems.filter((item) => item.name === demoName).length,
          1,
          `${demoName} should be seeded exactly once`,
        );
      }
    });

    await t.test("admin updates fields without bypassing stock audit", async () => {
      assert.ok(createdId);
      const response = await request(
        `/${createdId}`,
        {
          method: "PATCH",
          body: JSON.stringify({ active: true, description: "Now available" }),
        },
        ADMIN_ID,
      );
      assert.equal(response.status, 200);
      const item = (await response.json()) as PrasadamResponse;
      assert.equal(item.active, true);
      assert.equal(item.reservable, true);

      const stockPatch = await request(
        `/${createdId}`,
        { method: "PATCH", body: JSON.stringify({ stock: 999 }) },
        ADMIN_ID,
      );
      assert.equal(stockPatch.status, 400);
      assert.equal(((await stockPatch.json()) as ErrorResponse).error.code, "VALIDATION_ERROR");
    });

    await t.test("guarded adjustments cannot make stock negative", async () => {
      assert.ok(createdId);
      const adjusted = await request(
        `/${createdId}/adjust`,
        {
          method: "POST",
          body: JSON.stringify({ delta: -3, reason: "E2E damaged stock" }),
        },
        ADMIN_ID,
      );
      assert.equal(adjusted.status, 200);
      assert.equal(((await adjusted.json()) as PrasadamResponse).stock, 2);

      const rejected = await request(
        `/${createdId}/adjust`,
        {
          method: "POST",
          body: JSON.stringify({ delta: -3, reason: "Would be negative" }),
        },
        ADMIN_ID,
      );
      assert.equal(rejected.status, 409);
      assert.equal(
        ((await rejected.json()) as ErrorResponse).error.code,
        "STOCK_WOULD_GO_NEGATIVE",
      );

      const [stored] = await db
        .select({ stock: prasadamItems.stock })
        .from(prasadamItems)
        .where(eq(prasadamItems.id, createdId));
      assert.equal(stored.stock, 2);

      const movements = await db
        .select()
        .from(inventoryMovements)
        .where(eq(inventoryMovements.itemId, createdId));
      assert.equal(movements.length, 2);
      assert.equal(movements[1].type, "adjust");
      assert.equal(movements[1].quantity, -3);
    });

    await t.test("deactivation is the contract-supported delete flow", async () => {
      assert.ok(createdId);
      const response = await request(
        `/${createdId}`,
        { method: "PATCH", body: JSON.stringify({ active: false }) },
        ADMIN_ID,
      );
      assert.equal(response.status, 200);
      assert.equal(((await response.json()) as PrasadamResponse).active, false);
    });
  } finally {
    if (createdId) {
      await db.delete(prasadamItems).where(eq(prasadamItems.id, createdId));
    }
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
    await closeDatabase();
  }
});
