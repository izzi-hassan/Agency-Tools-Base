import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAuth } from "@/lib/auth-helpers";
import { pool } from "@/lib/pg";
import { isToolKey, TOOL_DESCRIPTIONS, TOOL_KEYS, TOOL_LABELS, type ToolKey } from "@/lib/tools";

const updateSchema = z.object({
  tools: z.record(z.string(), z.boolean())
});

type Params = { params: Promise<{ id: string }> };

type ToolRow = {
  tool_key: string;
  enabled: boolean;
};

type PropertyRow = {
  id: string;
  domain: string;
};

type SubscriptionRow = {
  tools_included: string[];
};

function toToolPayload(
  rows: ToolRow[],
  toolsIncluded: string[]
): Array<{
  key: ToolKey;
  label: string;
  description: string;
  enabled: boolean;
  available: boolean;
}> {
  const byKey = new Map(rows.map((row) => [row.tool_key, row.enabled]));

  return TOOL_KEYS.map((toolKey) => ({
    key: toolKey,
    label: TOOL_LABELS[toolKey],
    description: TOOL_DESCRIPTIONS[toolKey],
    enabled: Boolean(byKey.get(toolKey)),
    available: toolsIncluded.includes(toolKey)
  }));
}

export async function GET(_request: Request, { params }: Params) {
  const auth = await requireAuth();
  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await params;

  const propertyResult = await pool.query<PropertyRow>(
    "SELECT id, domain FROM properties WHERE id = $1 AND org_id = $2",
    [id, auth.orgId]
  );

  const property = propertyResult.rows[0];

  if (!property) {
    return NextResponse.json(
      { error: "NOT_FOUND", message: "Property not found." },
      { status: 404 }
    );
  }

  const subscriptionResult = await pool.query<SubscriptionRow>(
    `
    SELECT COALESCE(st.tools_included, '{}') AS tools_included
    FROM subscriptions s
    LEFT JOIN subscription_types st ON st.id = s.subscription_type_id
    WHERE s.org_id = $1
    `,
    [auth.orgId]
  );

  const toolsIncluded = subscriptionResult.rows[0]?.tools_included ?? [];

  const toolsResult = await pool.query<ToolRow>(
    `
    SELECT tool_key, enabled
    FROM property_tools
    WHERE property_id = $1
    `,
    [id]
  );

  return NextResponse.json({
    property,
    tools: toToolPayload(toolsResult.rows, toolsIncluded)
  });
}

export async function PUT(request: Request, { params }: Params) {
  const auth = await requireAuth();
  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "VALIDATION_ERROR",
        message: "Invalid tools payload.",
        details: parsed.error.flatten()
      },
      { status: 400 }
    );
  }

  const propertyResult = await pool.query<PropertyRow>(
    "SELECT id, domain FROM properties WHERE id = $1 AND org_id = $2",
    [id, auth.orgId]
  );

  if (!propertyResult.rows[0]) {
    return NextResponse.json(
      { error: "NOT_FOUND", message: "Property not found." },
      { status: 404 }
    );
  }

  const requestedEntries = Object.entries(parsed.data.tools);

  if (requestedEntries.length === 0) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", message: "At least one tool update is required." },
      { status: 400 }
    );
  }

  const invalidKey = requestedEntries.find(([key]) => !isToolKey(key));
  if (invalidKey) {
    return NextResponse.json(
      { error: "INVALID_TOOL_KEY", message: `Unknown tool key: ${invalidKey[0]}` },
      { status: 400 }
    );
  }

  const subscriptionResult = await pool.query<SubscriptionRow>(
    `
    SELECT COALESCE(st.tools_included, '{}') AS tools_included
    FROM subscriptions s
    LEFT JOIN subscription_types st ON st.id = s.subscription_type_id
    WHERE s.org_id = $1
    `,
    [auth.orgId]
  );

  const toolsIncluded = subscriptionResult.rows[0]?.tools_included ?? [];

  const unavailableEnabled = requestedEntries.find(
    ([key, enabled]) => enabled && !toolsIncluded.includes(key)
  );

  if (unavailableEnabled) {
    return NextResponse.json(
      {
        error: "TOOL_NOT_IN_PLAN",
        message: `${TOOL_LABELS[unavailableEnabled[0] as ToolKey]} is not included in your plan.`
      },
      { status: 403 }
    );
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    for (const [key, enabled] of requestedEntries) {
      await client.query(
        `
        INSERT INTO property_tools (property_id, tool_key, enabled)
        VALUES ($1, $2, $3)
        ON CONFLICT (property_id, tool_key)
        DO UPDATE SET enabled = EXCLUDED.enabled
        `,
        [id, key, enabled]
      );
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  const toolsResult = await pool.query<ToolRow>(
    `
    SELECT tool_key, enabled
    FROM property_tools
    WHERE property_id = $1
    `,
    [id]
  );

  return NextResponse.json({
    property: propertyResult.rows[0],
    tools: toToolPayload(toolsResult.rows, toolsIncluded)
  });
}
