# ADR 0005

## Title
Maintain backoffice as a separate Next.js app under `backoffice/`

## Decision
Implement internal admin tooling as a separate app directory with independent runtime and scripts.

## Rationale
- Clear separation between customer dashboard and internal operations surface.
- Different access policy (`@shinymetal.it` only) enforced at middleware + server route layers.
- Reduces accidental coupling of backoffice-only dependencies into customer app.

## Consequences
- Two app boot processes in local dev.
- Additional config to keep root TypeScript/ESLint from traversing backoffice.
- Shared DB schema must remain backwards compatible across both apps.
