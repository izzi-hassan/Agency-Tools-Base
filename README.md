# Agency Tools Base Dashboard

A base framework for building and launching SAAS products relating to web agency processes.

## Auth Setup (Clerk)

1. Create a Clerk application and grab your publishable/secret keys.
2. Set the environment variables in `.env.local` (see `.env.example`).
3. Configure the following redirect URLs in the Clerk dashboard:
   - Sign-in URL: `/sign-in`
   - Sign-up URL: `/sign-up`
   - After sign-in: `/select-org`
   - After sign-up: `/select-org`
   - After sign-out: `/sign-in`

## Local Development

```bash
pnpm install
pnpm db:up
pnpm db:migrate
pnpm dev
```

## Database (Postgres + SQL migrations)

Start local Postgres (Docker Compose):

```bash
pnpm db:up
```

Apply migrations from `db/migrations/*.sql`:

```bash
pnpm db:migrate
```

Run ad-hoc SQL:

```bash
pnpm db:psql -- "SELECT now();"
```

Stop local Postgres:

```bash
pnpm db:down
```

Properties are stored in Postgres (`properties` table) and always scoped by Clerk `orgId` (`properties.org_id`).

## Persistence E2E Check

1. Sign in and select or create an organization.
2. Open `/properties` and add a property.
3. Sign out from the dashboard header `UserButton`.
4. Sign back in with the same organization selected.
5. Confirm the same property still appears on `/properties`.

## Analytics pipeline (Pub/Sub -> Dataflow -> BigQuery)

### Prerequisites

- `gcloud` CLI, `bq`, and `gsutil` installed and authenticated
- GCP project with required permissions (Pub/Sub, Dataflow, BigQuery, Storage)
- APIs enabled: Pub/Sub, Dataflow, BigQuery, Cloud Storage

Set environment variables (see `.env.example`):

```bash
export GCP_PROJECT_ID="your-project-id"
export GCP_REGION="us-central1"
export PUBSUB_TOPIC_EVENTS="events"
export BQ_DATASET="webtools"
export BQ_TABLE_EVENTS_RAW="events_raw"
export DATAFLOW_TEMP_BUCKET="gs://your-dataflow-temp-bucket"
```

Create infra resources:

```bash
gsutil mb -l "$GCP_REGION" "$DATAFLOW_TEMP_BUCKET"
bq --project_id="$GCP_PROJECT_ID" query --use_legacy_sql=false < infra/gcp/bigquery.sql
bash infra/gcp/pubsub.sh
```

Start the Dataflow streaming template job:

```bash
bash infra/gcp/dataflow.sh
```

Local auth for publisher uses ADC:

```bash
gcloud auth application-default login
```

Production should use a GCP service account attached to the workload (later via GKE Workload Identity).

### Ingestion verification query

```sql
SELECT
  event_name,
  org_id,
  occurred_at,
  received_at,
  payload
FROM `webtools.events_raw`
ORDER BY received_at DESC
LIMIT 20;
```
