# Architecture

## System Overview
WebTools is a multi-tenant SaaS app built with Next.js App Router and Clerk organizations.

- Primary app: `/src` (customer dashboard)
- Admin app: `/backoffice` (internal control panel)
- Transactional datastore: PostgreSQL
- Analytics pipeline: Pub/Sub -> Dataflow -> BigQuery

## Runtime Components

### Main Dashboard App
Responsibilities:
- Property management (`/properties`)
- Plan display and billing actions (`/billing`)
- Per-property tool toggles

Key technical elements:
- Next.js 15 App Router
- Clerk auth with required active org
- Postgres access through pooled client (`src/lib/pg.ts`)

### Backoffice App
Responsibilities:
- Manage subscription catalog (`subscription_types`)
- View org subscriptions and billing state
- Restricted to `@shinymetal.it` users only

Isolation model:
- Separate Next.js app in `backoffice/`
- Separate local dependency graph and scripts
- Excluded from root TypeScript compile

## Data Model

### Core Org Model
- `organizations`
- `users`
- `memberships`

### Subscription and Entitlements
- `subscriptions`: org billing state + Stripe linkage
  - `stripe_customer_id`
  - `stripe_subscription_id`
  - `current_period_end`
  - `subscription_type_id`
- `entitlements`: materialized limits for runtime checks
  - `max_properties`
  - `tools_enabled`
- `subscription_types`: plan catalog managed in backoffice
  - pricing, interval, limits, tool bundle, sort order, active flag

### Property Tools
- `property_tools` stores per-property enable/disable state for each tool key
- Plan restrictions are enforced server-side before enabling tools

## Billing and Stripe Flow

### Checkout
1. User selects a subscription type in `/billing`.
2. API validates plan + Stripe price.
3. Checkout session is created and user is redirected to Stripe-hosted checkout.

### Portal
1. User clicks Manage Billing.
2. API creates Stripe Customer Portal session.
3. User is redirected to Stripe-hosted portal.

### Webhooks
Webhook endpoint: `/api/webhooks/stripe`

Handled events:
- `checkout.session.completed`
- `customer.subscription.updated`
- `customer.subscription.deleted`

Effects:
- sync subscription status and period
- update linked subscription type
- recompute entitlements from selected plan

## API Surface (New Billing/Tools)
- `GET/PUT /api/properties/[id]/tools`
- `GET /api/billing/status`
- `POST /api/billing/checkout`
- `POST /api/billing/portal`
- `POST /api/webhooks/stripe`

## Environment Variables
Main app:
- `DATABASE_URL`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_APP_URL`
- Clerk keys

Backoffice app:
- `DATABASE_URL`
- Clerk keys (with JWT template exposing email claim for middleware checks)

## Architectural Constraints
- All tenant data access must include `org_id` filter.
- Plan-level limits are enforced in APIs, not client-side only.
- Stripe mutations must flow through webhooks to remain source-of-truth aligned.
- Backoffice remains logically separate from customer dashboard runtime.
