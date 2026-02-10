import { currentUser } from "@clerk/nextjs/server";

import { pool } from "@/lib/pg";

type EnsureTenantInput = {
  orgId: string;
  userId: string;
};

export async function ensureTenant({ orgId, userId }: EnsureTenantInput): Promise<void> {
  const user = await currentUser();
  const primaryEmail =
    user?.emailAddresses.find((entry) => entry.id === user.primaryEmailAddressId)
      ?.emailAddress ??
    user?.emailAddresses[0]?.emailAddress ??
    `${userId}@unknown.local`;

  const displayName = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || null;
  const organizationName = "Unknown Organization";

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query(
      `
      INSERT INTO organizations (id, name)
      VALUES ($1, $2)
      ON CONFLICT (id)
      DO UPDATE SET name = EXCLUDED.name
      `,
      [orgId, organizationName]
    );

    await client.query(
      `
      INSERT INTO users (id, email, name)
      VALUES ($1, $2, $3)
      ON CONFLICT (id)
      DO UPDATE SET
        email = EXCLUDED.email,
        name = EXCLUDED.name
      `,
      [userId, primaryEmail, displayName]
    );

    await client.query(
      `
      INSERT INTO memberships (org_id, user_id, role)
      VALUES ($1, $2, 'OWNER')
      ON CONFLICT (org_id, user_id)
      DO NOTHING
      `,
      [orgId, userId]
    );

    await client.query(
      `
      INSERT INTO subscriptions (org_id, plan, status)
      VALUES ($1, 'FREE', 'ACTIVE')
      ON CONFLICT (org_id)
      DO NOTHING
      `,
      [orgId]
    );

    await client.query(
      `
      INSERT INTO entitlements (org_id, max_properties)
      VALUES ($1, 1)
      ON CONFLICT (org_id)
      DO NOTHING
      `,
      [orgId]
    );

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
