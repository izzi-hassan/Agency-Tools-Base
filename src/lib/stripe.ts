import Stripe from "stripe";

let client: Stripe | null = null;

export function getStripe(): Stripe {
  if (client) {
    return client;
  }

  const key = process.env.STRIPE_SECRET_KEY;

  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is required.");
  }

  client = new Stripe(key, {
    apiVersion: "2026-02-25.clover"
  });

  return client;
}
