import { NextResponse } from "next/server";

import { requireAuth } from "@/lib/auth-helpers";
import { pool } from "@/lib/pg";

type SubscriptionTypeRow = {
  id: string;
  name: string;
  description: string | null;
  price_cents: number;
  billing_interval: "month" | "year";
  max_properties: number;
  stripe_price_id: string | null;
  tools_included: string[];
  is_active: boolean;
  sort_order: number;
};

type CurrentSubscriptionRow = {
  org_id: string;
  plan: string;
  status: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  current_period_end: string | null;
  subscription_type_id: string | null;
  type_name: string | null;
  type_description: string | null;
  type_price_cents: number | null;
  type_billing_interval: "month" | "year" | null;
  type_max_properties: number | null;
  type_tools_included: string[] | null;
};

export async function GET() {
  const auth = await requireAuth();
  if (!auth.ok) {
    return auth.response;
  }

  const [currentResult, typesResult] = await Promise.all([
    pool.query<CurrentSubscriptionRow>(
      `
      SELECT
        s.org_id,
        s.plan,
        s.status,
        s.stripe_customer_id,
        s.stripe_subscription_id,
        s.current_period_end,
        s.subscription_type_id,
        st.name AS type_name,
        st.description AS type_description,
        st.price_cents AS type_price_cents,
        st.billing_interval AS type_billing_interval,
        st.max_properties AS type_max_properties,
        st.tools_included AS type_tools_included
      FROM subscriptions s
      LEFT JOIN subscription_types st ON st.id = s.subscription_type_id
      WHERE s.org_id = $1
      `,
      [auth.orgId]
    ),
    pool.query<SubscriptionTypeRow>(
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
        is_active,
        sort_order
      FROM subscription_types
      WHERE is_active = TRUE
      ORDER BY sort_order ASC, price_cents ASC, name ASC
      `
    )
  ]);

  const current = currentResult.rows[0] ?? null;

  return NextResponse.json({
    current: current
      ? {
          orgId: current.org_id,
          plan: current.plan,
          status: current.status,
          stripeCustomerId: current.stripe_customer_id,
          stripeSubscriptionId: current.stripe_subscription_id,
          currentPeriodEnd: current.current_period_end,
          subscriptionType: current.subscription_type_id
            ? {
                id: current.subscription_type_id,
                name: current.type_name,
                description: current.type_description,
                priceCents: current.type_price_cents,
                billingInterval: current.type_billing_interval,
                maxProperties: current.type_max_properties,
                toolsIncluded: current.type_tools_included ?? []
              }
            : null
        }
      : null,
    subscriptionTypes: typesResult.rows.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      priceCents: row.price_cents,
      billingInterval: row.billing_interval,
      maxProperties: row.max_properties,
      stripePriceId: row.stripe_price_id,
      toolsIncluded: row.tools_included,
      isActive: row.is_active,
      sortOrder: row.sort_order
    }))
  });
}
