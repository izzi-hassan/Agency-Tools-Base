# ADR 0004

## Title
Use Stripe Checkout + Customer Portal + Webhooks for subscription lifecycle

## Decision
Adopt hosted Stripe Checkout and hosted Customer Portal, with webhook-driven state synchronization.

## Rationale
- Reduces PCI scope and custom billing UI complexity.
- Uses Stripe as source of truth for subscription status transitions.
- Keeps billing UX implementation fast while preserving enterprise upgrade path.

## Consequences
- Requires reliable webhook handling and secret management.
- Local development requires webhook forwarding setup.
- Subscription updates must not rely solely on client return URLs.
