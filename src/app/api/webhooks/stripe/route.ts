import { NextResponse } from "next/server";
import Stripe from "stripe";

import { pool } from "@/lib/pg";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

function mapStripeStatus(status: string): "ACTIVE" | "PAST_DUE" | "CANCELED" {
  if (status === "past_due" || status === "unpaid") {
    return "PAST_DUE";
  }
  if (status === "canceled" || status === "incomplete_expired") {
    return "CANCELED";
  }
  return "ACTIVE";
}

function getPeriodEnd(subscription: Record<string, unknown>): string | null {
  const value = subscription["current_period_end"];
  if (typeof value === "number" && value > 0) {
    return new Date(value * 1000).toISOString();
  }
  return null;
}

async function applyPlanForOrg(orgId: string, subscriptionTypeId: string | null) {
  if (!subscriptionTypeId) {
    return;
  }

  await pool.query(
    `
    UPDATE subscriptions s
    SET
      subscription_type_id = st.id,
      plan = UPPER(st.name)
    FROM subscription_types st
    WHERE s.org_id = $1
      AND st.id = $2
    `,
    [orgId, subscriptionTypeId]
  );

  await pool.query(
    `
    UPDATE entitlements e
    SET
      max_properties = st.max_properties,
      tools_enabled = st.tools_included
    FROM subscriptions s
    JOIN subscription_types st ON st.id = s.subscription_type_id
    WHERE e.org_id = s.org_id
      AND e.org_id = $1
    `,
    [orgId]
  );
}

export async function POST(request: Request) {
  const stripe = getStripe();
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json(
      { error: "MISSING_WEBHOOK_CONFIG", message: "Webhook signature or secret is missing." },
      { status: 400 }
    );
  }

  const payload = await request.text();

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch {
    return NextResponse.json(
      { error: "INVALID_SIGNATURE", message: "Invalid Stripe webhook signature." },
      { status: 400 }
    );
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const orgId = session.metadata?.orgId;
    const subscriptionTypeId = session.metadata?.subscriptionTypeId ?? null;
    const customerId =
      typeof session.customer === "string" ? session.customer : session.customer?.id ?? null;
    const subscriptionId =
      typeof session.subscription === "string"
        ? session.subscription
        : session.subscription?.id ?? null;

    if (orgId) {
      await pool.query(
        `
        UPDATE subscriptions
        SET
          status = 'ACTIVE',
          stripe_customer_id = COALESCE($2, stripe_customer_id),
          stripe_subscription_id = COALESCE($3, stripe_subscription_id)
        WHERE org_id = $1
        `,
        [orgId, customerId, subscriptionId]
      );

      await applyPlanForOrg(orgId, subscriptionTypeId);
    }
  }

  if (event.type === "customer.subscription.updated") {
    const subscription = event.data.object as Stripe.Subscription;
    const status = mapStripeStatus(subscription.status);
    const subscriptionId = subscription.id;
    const periodEnd = getPeriodEnd(subscription as unknown as Record<string, unknown>);

    const result = await pool.query<{ org_id: string }>(
      `
      UPDATE subscriptions
      SET
        status = $2,
        current_period_end = $3,
        stripe_subscription_id = $1
      WHERE stripe_subscription_id = $1
      RETURNING org_id
      `,
      [subscriptionId, status, periodEnd]
    );

    const orgId = result.rows[0]?.org_id;

    if (orgId) {
      const subscriptionTypeId =
        (subscription.metadata?.subscriptionTypeId as string | undefined) ??
        (subscription.items.data[0]?.price?.metadata?.subscriptionTypeId as string | undefined) ??
        null;
      await applyPlanForOrg(orgId, subscriptionTypeId);
    }
  }

  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object as Stripe.Subscription;

    const result = await pool.query<{ org_id: string }>(
      `
      UPDATE subscriptions
      SET
        status = 'CANCELED',
        stripe_subscription_id = NULL,
        current_period_end = NULL
      WHERE stripe_subscription_id = $1
      RETURNING org_id
      `,
      [subscription.id]
    );

    const orgId = result.rows[0]?.org_id;

    if (orgId) {
      const freeType = await pool.query<{ id: string }>(
        "SELECT id FROM subscription_types WHERE name = 'Free' AND is_active = TRUE LIMIT 1"
      );
      const freeTypeId = freeType.rows[0]?.id ?? null;
      await applyPlanForOrg(orgId, freeTypeId);
    }
  }

  return NextResponse.json({ received: true });
}
