# Workflow

## Development Flow
1. Start DB and apply migrations.
2. Run dashboard app.
3. Run backoffice app when editing plan catalog.
4. Validate with lint + TypeScript.

## Commands

### Main App
- `pnpm dev`
- `pnpm lint`
- `pnpm build`

### Database
- `pnpm db:up`
- `pnpm db:migrate`
- `pnpm db:psql`

### Backoffice
- `pnpm backoffice:dev`
- `pnpm backoffice:build`

## Billing Integration Workflow
1. Configure Stripe keys in env.
2. Create Stripe prices and map each `subscription_types.stripe_price_id`.
3. Start checkout from billing page.
4. Forward Stripe webhooks to `/api/webhooks/stripe`.
5. Verify subscription + entitlements updates in DB.

## Safe Change Pattern
- Update DB schema first (SQL migration).
- Add server-side validations in APIs.
- Add UI controls after API behavior is stable.
- Update docs + ADRs in the same change set.

## Backoffice Access Setup
- Ensure Clerk session claims provide email for middleware checks.
- Use `@shinymetal.it` accounts only.
- Keep all mutating backoffice routes protected by server-side auth checks.
