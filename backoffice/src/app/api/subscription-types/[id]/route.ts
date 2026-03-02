import { NextResponse } from "next/server";
import { z } from "zod";

import { requireBackofficeApiAuth } from "@/lib/auth";
import { pool } from "@/lib/pg";
import { isToolKey } from "@/lib/tools-api";

const schema = z.object({
  name: z.string().trim().min(1),
  description: z.string().trim().nullable(),
  priceCents: z.number().int().min(0),
  billingInterval: z.enum(["month", "year"]),
  maxProperties: z.number().int().min(1),
  stripePriceId: z.string().trim().nullable(),
  toolsIncluded: z.array(z.string()),
  sortOrder: z.number().int(),
  isActive: z.boolean()
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireBackofficeApiAuth();
  if (authError) {
    return authError;
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "VALIDATION_ERROR",
        message: "Invalid payload",
        details: parsed.error.flatten()
      },
      { status: 400 }
    );
  }

  const invalidTool = parsed.data.toolsIncluded.find((tool) => !isToolKey(tool));
  if (invalidTool) {
    return NextResponse.json(
      { error: "INVALID_TOOL", message: `Invalid tool key: ${invalidTool}` },
      { status: 400 }
    );
  }

  try {
    const result = await pool.query(
      `
      UPDATE subscription_types
      SET
        name = $2,
        description = $3,
        price_cents = $4,
        billing_interval = $5,
        max_properties = $6,
        stripe_price_id = $7,
        tools_included = $8,
        sort_order = $9,
        is_active = $10
      WHERE id = $1
      RETURNING *
      `,
      [
        id,
        parsed.data.name,
        parsed.data.description,
        parsed.data.priceCents,
        parsed.data.billingInterval,
        parsed.data.maxProperties,
        parsed.data.stripePriceId,
        parsed.data.toolsIncluded,
        parsed.data.sortOrder,
        parsed.data.isActive
      ]
    );

    const row = result.rows[0];
    if (!row) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Subscription type not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({ subscriptionType: row });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "23505") {
      return NextResponse.json(
        { error: "CONFLICT", message: "A subscription type with this name already exists." },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "INTERNAL_SERVER_ERROR", message: "Failed to update subscription type." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireBackofficeApiAuth();
  if (authError) {
    return authError;
  }

  const { id } = await params;

  const usage = await pool.query<{ count: string }>(
    "SELECT COUNT(*)::text AS count FROM subscriptions WHERE subscription_type_id = $1",
    [id]
  );

  if (Number(usage.rows[0]?.count ?? "0") > 0) {
    const softDeleted = await pool.query(
      "UPDATE subscription_types SET is_active = FALSE WHERE id = $1 RETURNING id",
      [id]
    );

    if (!softDeleted.rows[0]) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Subscription type not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, deleted: "soft" });
  }

  const hardDeleted = await pool.query("DELETE FROM subscription_types WHERE id = $1 RETURNING id", [id]);

  if (!hardDeleted.rows[0]) {
    return NextResponse.json(
      { error: "NOT_FOUND", message: "Subscription type not found." },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true, deleted: "hard" });
}
