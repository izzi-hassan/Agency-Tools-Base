import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { ensureTenant } from "@/lib/ensure-tenant";
import { pool } from "@/lib/pg";

const domainRegex = /^(?=.{3,253}$)(?!-)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;

const createPropertySchema = z.object({
  domain: z.string().trim().toLowerCase().regex(domainRegex, "Invalid domain"),
  domainAliases: z
    .array(z.string().trim().toLowerCase().regex(domainRegex, "Invalid domain alias"))
    .optional()
    .default([]),
  ipAddress: z.string().trim().max(255).optional(),
  hostingProvider: z.string().trim().max(255).optional(),
  notes: z.string().trim().max(5000).optional()
});

type PropertyRow = {
  id: string;
  domain: string;
  domain_aliases: string[];
  ip_address: string | null;
  hosting_provider: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

function toProperty(row: PropertyRow) {
  return {
    id: row.id,
    domain: row.domain,
    domainAliases: row.domain_aliases,
    ipAddress: row.ip_address,
    hostingProvider: row.hosting_provider,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

async function authErrorResponse() {
  const { userId, orgId } = await auth();

  if (!userId) {
    return NextResponse.json(
      {
        error: "UNAUTHORIZED",
        message: "Authentication is required."
      },
      { status: 401 }
    );
  }

  if (!orgId) {
    return NextResponse.json(
      {
        error: "ORG_REQUIRED",
        message: "An active organization is required."
      },
      { status: 400 }
    );
  }

  return null;
}

export async function GET() {
  const errorResponse = await authErrorResponse();
  if (errorResponse) {
    return errorResponse;
  }

  const { userId, orgId } = await auth();
  await ensureTenant({ orgId: orgId!, userId: userId! });

  const result = await pool.query<PropertyRow>(
    `
    SELECT
      id,
      domain,
      domain_aliases,
      ip_address,
      hosting_provider,
      notes,
      created_at,
      updated_at
    FROM properties
    WHERE org_id = $1
    ORDER BY created_at DESC
    `,
    [orgId]
  );

  return NextResponse.json({ properties: result.rows.map(toProperty) });
}

export async function POST(request: Request) {
  const errorResponse = await authErrorResponse();
  if (errorResponse) {
    return errorResponse;
  }

  const { userId, orgId } = await auth();
  await ensureTenant({ orgId: orgId!, userId: userId! });

  const payload = await request.json().catch(() => null);
  const parsed = createPropertySchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "VALIDATION_ERROR",
        message: "Invalid property payload.",
        details: parsed.error.flatten()
      },
      { status: 400 }
    );
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const entitlementResult = await client.query<{ max_properties: number }>(
      "SELECT max_properties FROM entitlements WHERE org_id = $1",
      [orgId]
    );

    const maxProperties = entitlementResult.rows[0]?.max_properties ?? 1;

    const countResult = await client.query<{ count: string }>(
      "SELECT COUNT(*)::text AS count FROM properties WHERE org_id = $1",
      [orgId]
    );

    const propertyCount = Number(countResult.rows[0]?.count ?? "0");

    if (propertyCount >= maxProperties) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        {
          error: "PROPERTY_LIMIT_REACHED",
          message: "Free plan allows 1 property. Upgrade to add more."
        },
        { status: 403 }
      );
    }

    const insertResult = await client.query<PropertyRow>(
      `
      INSERT INTO properties (org_id, domain, domain_aliases, ip_address, hosting_provider, notes)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING
        id,
        domain,
        domain_aliases,
        ip_address,
        hosting_provider,
        notes,
        created_at,
        updated_at
      `,
      [
        orgId,
        parsed.data.domain,
        parsed.data.domainAliases,
        parsed.data.ipAddress || null,
        parsed.data.hostingProvider || null,
        parsed.data.notes || null
      ]
    );

    await client.query("COMMIT");

    return NextResponse.json({ property: toProperty(insertResult.rows[0]) }, { status: 201 });
  } catch (error) {
    await client.query("ROLLBACK");

    if (typeof error === "object" && error !== null && "code" in error && error.code === "23505") {
      return NextResponse.json(
        {
          error: "DOMAIN_CONFLICT",
          message: "This domain already exists in your organization."
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        error: "INTERNAL_SERVER_ERROR",
        message: "Failed to create property."
      },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
