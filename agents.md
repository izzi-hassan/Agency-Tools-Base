# agents.md

This file captures recommended engineering practices for the technologies used in this repository.

## Next.js 15 (App Router)
- Keep data writes in Route Handlers or server actions; do not trust client-side enforcement for business rules.
- Prefer Server Components by default; opt into Client Components only for interactive UI.
- Co-locate route-specific loading/error states in route segments.
- Keep API routes thin: validate input, call domain helpers, return typed JSON.
- Use middleware only for fast gate checks (auth/org presence), not heavy DB work.

## React 18
- Keep components focused: presentation in `components/*`, domain logic in `lib/*`.
- Use controlled components for forms that affect billing, entitlements, or tool toggles.
- Avoid duplicated state across component boundaries; derive when possible.
- Treat all async UI actions as failure-prone: render pending, success, and error states explicitly.

## TypeScript 5
- Keep `strict` typing discipline; avoid `any` in route handlers and DB adapters.
- Model request/response contracts with inferred types from Zod schemas.
- Narrow unknown errors before reading fields (especially Stripe and PG errors).
- Export shared domain types from `src/lib/*` to avoid drift between route handlers and UI.

## Tailwind CSS + Radix UI
- Use Tailwind utilities and `cn`/`tailwind-merge` helpers consistently; avoid ad-hoc inline styles.
- Keep design tokens centralized in global styles and Tailwind config.
- Wrap Radix primitives in local UI components (already established in `components/ui/*`) before reuse.
- Validate keyboard/focus behavior for dialogs, menus, and switches after UI changes.

## Clerk Authentication (Organizations)
- Require an active org for all tenant-scoped routes and APIs.
- Resolve `orgId` server-side and enforce org filtering in every DB query.
- Never accept tenant/org identity from untrusted client payloads.
- Keep backoffice authorization separate from dashboard checks (different trust boundary).

## PostgreSQL (`pg`) + SQL migrations
- Treat Postgres as source of truth for transactional state.
- Every tenant row access must include `org_id` predicates.
- Use parameterized SQL only; never string-concatenate user input.
- Keep migrations forward-only and idempotent-safe for CI/local re-runs.
- Add indexes for frequent tenant filters and webhook lookup keys.

## Prisma (schema ownership)
- Keep `prisma/schema.prisma` aligned with live SQL schema.
- Do not mix conflicting migration sources; define whether `db/migrations` or Prisma drives schema changes per change set.
- Regenerate client artifacts only when schema changes require it.

## Stripe Billing
- Use webhook events as source of truth for subscription lifecycle changes.
- Verify webhook signatures and reject unverified requests.
- Make webhook processing idempotent (safe on retries/out-of-order delivery).
- Store Stripe object IDs (`customer`, `subscription`, `price`) in normalized DB fields.
- Do not grant entitlements until webhook confirmation updates local state.

## Zod Validation
- Validate all external inputs (query params, route params, JSON bodies, webhook metadata assumptions).
- Parse at API boundaries and pass typed values deeper into domain functions.
- Return consistent, structured 4xx errors for invalid input.

## Docker Compose (local DB)
- Keep local infrastructure minimal and reproducible (`db:up`, `db:down`, `db:migrate`).
- Pin container/service versions to avoid environment drift.
- Use ephemeral local data for dev unless persistence is explicitly needed.

## GCP Analytics (Pub/Sub -> Dataflow -> BigQuery)
- Treat analytics ingestion as at-least-once; make downstream writes dedupe-safe.
- Include event metadata (`event_name`, `org_id`, timestamps, idempotency keys where possible).
- Keep schema evolution additive and versioned to avoid breaking consumers.
- Separate operational dashboards (transactional DB) from analytical queries (BigQuery).

## Multi-app repo (dashboard + backoffice)
- Preserve separation of concerns between `src/` and `backoffice/` runtimes.
- Share only stable domain utilities; avoid accidental cross-app coupling.
- Run and verify each app independently before merge.
- Keep env var contracts explicit per app in docs and `.env.example`.

## Testing and quality gates
- Run lint/build checks for both apps before merging.
- Add regression tests for billing state transitions and entitlement enforcement.
- Add API-level tests for org isolation (no cross-tenant data access).
- Verify webhook replay behavior in local/dev test flows.
