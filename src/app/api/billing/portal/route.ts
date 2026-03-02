import { NextResponse } from "next/server";

import { requireAuth } from "@/lib/auth-helpers";
import { pool } from "@/lib/pg";
import { getStripe } from "@/lib/stripe";

type SubscriptionRow = {
  stripe_customer_id: string | null;
};

export async function POST() {
  const auth = await requireAuth();
  if (!auth.ok) {
    return auth.response;
  }

  const subscriptionResult = await pool.query<SubscriptionRow>(
    "SELECT stripe_customer_id FROM subscriptions WHERE org_id = $1",
    [auth.orgId]
  );

  const stripeCustomerId = subscriptionResult.rows[0]?.stripe_customer_id;

  if (!stripeCustomerId) {
    return NextResponse.json(
      { error: "NO_STRIPE_CUSTOMER", message: "No Stripe customer is linked to this organization." },
      { status: 400 }
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) {
    return NextResponse.json(
      { error: "MISSING_APP_URL", message: "NEXT_PUBLIC_APP_URL is required." },
      { status: 500 }
    );
  }

  const stripe = getStripe();
  const session = await stripe.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: `${appUrl}/billing`
  });

  return NextResponse.json({ url: session.url });
}
