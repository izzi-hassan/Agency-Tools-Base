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

export async function GET() {
  const authError = await requireBackofficeApiAuth();
  if (authError) {
    return authError;
  }

  const result = await pool.query(
    `
    SELECT
      id,
      name,
      description,
      price_cents,
      billing_interval,
      max_properties,
      stripe_price_id,
      tools_included,
      sort_order,
      is_active,
      created_at,
      updated_at
    FROM subscription_types
    ORDER BY sort_order ASC, price_cents ASC
    `
  );

  return NextResponse.json({ subscriptionTypes: result.rows });
}

export async function POST(request: Request) {
  const authError = await requireBackofficeApiAuth();
  if (authError) {
    return authError;
  }

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
      INSERT INTO subscription_types (
        name,
        description,
        price_cents,
        billing_interval,
        max_properties,
        stripe_price_id,
        tools_included,
        sort_order,
        is_active
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
      `,
      [
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

    return NextResponse.json({ subscriptionType: result.rows[0] }, { status: 201 });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "23505") {
      return NextResponse.json(
        { error: "CONFLICT", message: "A subscription type with this name already exists." },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "INTERNAL_SERVER_ERROR", message: "Failed to create subscription type." },
      { status: 500 }
    );
  }
}
