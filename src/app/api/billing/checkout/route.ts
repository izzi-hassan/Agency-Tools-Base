import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAuth } from "@/lib/auth-helpers";
import { pool } from "@/lib/pg";
import { getStripe } from "@/lib/stripe";

const schema = z.object({
  subscriptionTypeId: z.string().uuid()
});

type SubscriptionTypeRow = {
  id: string;
  name: string;
  stripe_price_id: string | null;
};

type SubscriptionRow = {
  stripe_customer_id: string | null;
};

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (!auth.ok) {
    return auth.response;
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "VALIDATION_ERROR",
        message: "Invalid checkout payload.",
        details: parsed.error.flatten()
      },
      { status: 400 }
    );
  }

  const subscriptionTypeResult = await pool.query<SubscriptionTypeRow>(
    `
    SELECT id, name, stripe_price_id
    FROM subscription_types
    WHERE id = $1 AND is_active = TRUE
    `,
    [parsed.data.subscriptionTypeId]
  );

  const subscriptionType = subscriptionTypeResult.rows[0];

  if (!subscriptionType) {
    return NextResponse.json(
      { error: "NOT_FOUND", message: "Subscription type not found." },
      { status: 404 }
    );
  }

  if (!subscriptionType.stripe_price_id) {
    return NextResponse.json(
      {
        error: "MISSING_STRIPE_PRICE",
        message: `Plan ${subscriptionType.name} is not configured for Stripe checkout.`
      },
      { status: 400 }
    );
  }

  const subscriptionResult = await pool.query<SubscriptionRow>(
    "SELECT stripe_customer_id FROM subscriptions WHERE org_id = $1",
    [auth.orgId]
  );

  const stripe = getStripe();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!appUrl) {
    return NextResponse.json(
      { error: "MISSING_APP_URL", message: "NEXT_PUBLIC_APP_URL is required." },
      { status: 500 }
    );
  }

  let stripeCustomerId = subscriptionResult.rows[0]?.stripe_customer_id ?? null;

  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      metadata: {
        orgId: auth.orgId,
        userId: auth.userId
      }
    });

    stripeCustomerId = customer.id;

    await pool.query(
      "UPDATE subscriptions SET stripe_customer_id = $2 WHERE org_id = $1",
      [auth.orgId, stripeCustomerId]
    );
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: stripeCustomerId,
    line_items: [{ price: subscriptionType.stripe_price_id, quantity: 1 }],
    subscription_data: {
      metadata: {
        orgId: auth.orgId,
        subscriptionTypeId: subscriptionType.id
      }
    },
    success_url: `${appUrl}/billing?success=1`,
    cancel_url: `${appUrl}/billing?canceled=1`,
    metadata: {
      orgId: auth.orgId,
      subscriptionTypeId: subscriptionType.id
    }
  });

  return NextResponse.json({ url: session.url });
}
