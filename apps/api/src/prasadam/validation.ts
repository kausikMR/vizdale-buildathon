import { AppError } from "../errors.js";

type JsonObject = Record<string, unknown>;

export interface CreatePrasadamInput {
  name: string;
  description: string;
  displayPrice: string;
  stock: number;
  reorderLevel: number;
  active: boolean;
}

export type UpdatePrasadamInput = Partial<
  Omit<CreatePrasadamInput, "stock">
>;

export interface AdjustStockInput {
  delta: number;
  reason: string;
}

function validationError(message: string): never {
  throw new AppError(400, "VALIDATION_ERROR", message);
}

function asObject(value: unknown): JsonObject {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    validationError("Send the prasadam details as a JSON object.");
  }
  return value as JsonObject;
}

function rejectUnknownFields(body: JsonObject, allowed: readonly string[]): void {
  const unknown = Object.keys(body).filter((key) => !allowed.includes(key));
  if (unknown.length > 0) {
    validationError(`Remove unsupported field${unknown.length === 1 ? "" : "s"}: ${unknown.join(", ")}.`);
  }
}

function requiredName(value: unknown): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    validationError("Enter a name for the prasadam item.");
  }
  if (value.trim().length > 160) {
    validationError("Keep the prasadam item name to 160 characters or fewer.");
  }
  return value.trim();
}

function optionalDescription(value: unknown, fallback?: string): string {
  if (value === undefined && fallback !== undefined) return fallback;
  if (typeof value !== "string") {
    validationError("Description must be text.");
  }
  if (value.length > 2_000) {
    validationError("Keep the description to 2000 characters or fewer.");
  }
  return value.trim();
}

function nonNegativeInteger(value: unknown, field: string, fallback?: number): number {
  if (value === undefined && fallback !== undefined) return fallback;
  if (!Number.isInteger(value) || (value as number) < 0) {
    validationError(`${field} must be a whole number of zero or more.`);
  }
  return value as number;
}

function booleanValue(value: unknown, field: string, fallback?: boolean): boolean {
  if (value === undefined && fallback !== undefined) return fallback;
  if (typeof value !== "boolean") {
    validationError(`${field} must be true or false.`);
  }
  return value;
}

function priceValue(value: unknown, fallback?: string): string {
  if (value === undefined && fallback !== undefined) return fallback;
  if (value === null || value === "") return "0.00";
  if (typeof value !== "number" && typeof value !== "string") {
    validationError("Display price must be a non-negative amount with at most two decimal places.");
  }

  const normalized = String(value).trim();
  if (!/^\d{1,8}(\.\d{1,2})?$/.test(normalized)) {
    validationError("Display price must be a non-negative amount with at most two decimal places.");
  }
  return Number(normalized).toFixed(2);
}

export function parseCreatePrasadam(bodyValue: unknown): CreatePrasadamInput {
  const body = asObject(bodyValue);
  rejectUnknownFields(body, [
    "name",
    "description",
    "displayPrice",
    "stock",
    "reorderLevel",
    "active",
  ]);

  return {
    name: requiredName(body.name),
    description: optionalDescription(body.description, ""),
    displayPrice: priceValue(body.displayPrice, "0.00"),
    stock: nonNegativeInteger(body.stock, "Stock", 0),
    reorderLevel: nonNegativeInteger(body.reorderLevel, "Reorder level", 0),
    active: booleanValue(body.active, "Active", true),
  };
}

export function parseUpdatePrasadam(bodyValue: unknown): UpdatePrasadamInput {
  const body = asObject(bodyValue);
  rejectUnknownFields(body, [
    "name",
    "description",
    "displayPrice",
    "reorderLevel",
    "active",
  ]);

  if (Object.keys(body).length === 0) {
    validationError("Change at least one prasadam item field.");
  }

  const update: UpdatePrasadamInput = {};
  if ("name" in body) update.name = requiredName(body.name);
  if ("description" in body) {
    update.description = optionalDescription(body.description);
  }
  if ("displayPrice" in body) update.displayPrice = priceValue(body.displayPrice);
  if ("reorderLevel" in body) {
    update.reorderLevel = nonNegativeInteger(body.reorderLevel, "Reorder level");
  }
  if ("active" in body) update.active = booleanValue(body.active, "Active");
  return update;
}

export function parseAdjustStock(bodyValue: unknown): AdjustStockInput {
  const body = asObject(bodyValue);
  rejectUnknownFields(body, ["delta", "reason"]);
  if (!Number.isInteger(body.delta) || body.delta === 0) {
    validationError("Stock adjustment must be a non-zero whole number.");
  }
  if (typeof body.reason !== "string" || body.reason.trim().length === 0) {
    validationError("Enter a reason for the stock adjustment.");
  }
  if (body.reason.trim().length > 500) {
    validationError("Keep the adjustment reason to 500 characters or fewer.");
  }
  return { delta: body.delta as number, reason: body.reason.trim() };
}

export function validateUuid(value: string | string[]): string {
  if (
    typeof value !== "string" ||
    !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value)
  ) {
    throw new AppError(404, "NOT_FOUND", "That prasadam item could not be found.");
  }
  return value;
}
