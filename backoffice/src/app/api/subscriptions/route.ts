import { NextResponse } from "next/server";

import { requireBackofficeApiAuth } from "@/lib/auth";
import { pool } from "@/lib/pg";

export async function GET() {
  const authError = await requireBackofficeApiAuth();
  if (authError) {
    return authError;
  }

  const result = await pool.query(
    `
    SELECT
      s.org_id,
      o.name AS org_name,
      s.plan,
      s.status,
      s.stripe_customer_id,
      s.stripe_subscription_id,
      s.current_period_end,
      st.name AS subscription_type_name,
      st.price_cents,
      st.billing_interval,
      st.max_properties
    FROM subscriptions s
    JOIN organizations o ON o.id = s.org_id
    LEFT JOIN subscription_types st ON st.id = s.subscription_type_id
    ORDER BY o.created_at DESC
    `
  );

  return NextResponse.json({ subscriptions: result.rows });
}
