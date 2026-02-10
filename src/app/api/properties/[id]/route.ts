import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { ensureTenant } from "@/lib/ensure-tenant";
import { pool } from "@/lib/pg";

const domainRegex = /^(?=.{3,253}$)(?!-)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;

const updatePropertySchema = z
  .object({
    domain: z.string().trim().toLowerCase().regex(domainRegex, "Invalid domain").optional(),
    domainAliases: z
      .array(z.string().trim().toLowerCase().regex(domainRegex, "Invalid domain alias"))
      .optional(),
    ipAddress: z.string().trim().max(255).optional(),
    hostingProvider: z.string().trim().max(255).optional(),
    notes: z.string().trim().max(5000).optional()
  })
  .refine(
    (value) =>
      value.domain !== undefined ||
      value.domainAliases !== undefined ||
      value.ipAddress !== undefined ||
      value.hostingProvider !== undefined ||
      value.notes !== undefined,
    { message: "At least one field is required." }
  );

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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const errorResponse = await authErrorResponse();
  if (errorResponse) {
    return errorResponse;
  }

  const { userId, orgId } = await auth();
  await ensureTenant({ orgId: orgId!, userId: userId! });

  const { id } = await params;
  const payload = await request.json().catch(() => null);
  const parsed = updatePropertySchema.safeParse(payload);

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

  try {
    const result = await pool.query<PropertyRow>(
      `
      UPDATE properties
      SET
        domain = COALESCE($3, domain),
        domain_aliases = COALESCE($4, domain_aliases),
        ip_address = COALESCE($5, ip_address),
        hosting_provider = COALESCE($6, hosting_provider),
        notes = COALESCE($7, notes)
      WHERE id = $1 AND org_id = $2
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
        id,
        orgId,
        parsed.data.domain ?? null,
        parsed.data.domainAliases ?? null,
        parsed.data.ipAddress ?? null,
        parsed.data.hostingProvider ?? null,
        parsed.data.notes ?? null
      ]
    );

    const property = result.rows[0];

    if (!property) {
      return NextResponse.json(
        {
          error: "NOT_FOUND",
          message: "Property not found."
        },
        { status: 404 }
      );
    }

    return NextResponse.json({ property: toProperty(property) });
  } catch (error) {
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
        message: "Failed to update property."
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const errorResponse = await authErrorResponse();
  if (errorResponse) {
    return errorResponse;
  }

  const { userId, orgId } = await auth();
  await ensureTenant({ orgId: orgId!, userId: userId! });

  const { id } = await params;

  const result = await pool.query<{ id: string }>(
    "DELETE FROM properties WHERE id = $1 AND org_id = $2 RETURNING id",
    [id, orgId]
  );

  if (!result.rows[0]) {
    return NextResponse.json(
      {
        error: "NOT_FOUND",
        message: "Property not found."
      },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true });
}
