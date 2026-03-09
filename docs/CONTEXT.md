# Context

## Product Purpose
WebTools provides property-level operational tooling for teams managing domains and infrastructure metadata.

Current feature themes:
- multi-tenant org workspace
- subscription-aware limits
- Stripe billing lifecycle
- internal backoffice plan management

## What Is Implemented

### Tenant and Property Management
- Clerk org-based access
- tenant bootstrap (`ensureTenant`) for org/user/subscription records
- property CRUD with entitlement limit enforcement

### Tools System
Eight canonical tools are defined and plan-gated:
- uptime_monitor
- analytics
- user_journeys
- data_protection
- backups
- error_logging
- event_logging
- visual_regression

Each property can toggle tools through `/properties` -> Tools dialog.

### Billing
- Plan cards on billing page
- Stripe Checkout integration
- Stripe Customer Portal integration
- Webhook synchronization of subscription state

### Backoffice
Separate app in `backoffice/`:
- list subscriptions by organization
- create/edit/delete subscription types
- soft-delete behavior for in-use plans
- access restricted to `@shinymetal.it`

## Migration State
- `001_init.sql`: base schema
- `002_tools_billing.sql`: subscription types, property tools, Stripe fields, entitlement tool bundles

## Operational Notes
- Migration runner applies SQL files in lexical order and tracks `schema_migrations`.
- In local dev, Docker Postgres must be up before running migrations.
- Production `next build` may fail in restricted-network environments if Google Fonts cannot be fetched.
