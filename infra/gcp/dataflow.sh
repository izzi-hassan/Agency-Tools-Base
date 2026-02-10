#!/usr/bin/env bash
set -euo pipefail

: "${GCP_PROJECT_ID:?GCP_PROJECT_ID is required}"
: "${DATAFLOW_TEMP_BUCKET:?DATAFLOW_TEMP_BUCKET is required (example: gs://my-dataflow-temp-bucket)}"

GCP_REGION="${GCP_REGION:-us-central1}"
PUBSUB_TOPIC_EVENTS="${PUBSUB_TOPIC_EVENTS:-events}"
BQ_DATASET="${BQ_DATASET:-webtools}"
BQ_TABLE_EVENTS_RAW="${BQ_TABLE_EVENTS_RAW:-events_raw}"
JOB_NAME="${DATAFLOW_JOB_NAME:-pubsub-to-bq-events-$(date +%Y%m%d-%H%M%S)}"

# Official Google-provided classic template: Pub/Sub to BigQuery.
# Template location pattern from Dataflow docs:
# gs://dataflow-templates-REGION/latest/PubSub_to_BigQuery
TEMPLATE_GCS_LOCATION="${TEMPLATE_GCS_LOCATION:-gs://dataflow-templates-${GCP_REGION}/latest/PubSub_to_BigQuery}"

OUTPUT_TABLE_SPEC="${GCP_PROJECT_ID}:${BQ_DATASET}.${BQ_TABLE_EVENTS_RAW}"

if [[ -n "${INPUT_SUBSCRIPTION:-}" ]]; then
  INPUT_PARAM="inputSubscription=projects/${GCP_PROJECT_ID}/subscriptions/${INPUT_SUBSCRIPTION}"
else
  INPUT_PARAM="inputTopic=projects/${GCP_PROJECT_ID}/topics/${PUBSUB_TOPIC_EVENTS}"
fi

printf "Starting Dataflow job: %s\n" "$JOB_NAME"
printf "Region: %s\n" "$GCP_REGION"
printf "Template: %s\n" "$TEMPLATE_GCS_LOCATION"
printf "Output table: %s\n" "$OUTPUT_TABLE_SPEC"

gcloud dataflow jobs run "$JOB_NAME" \
  --project="$GCP_PROJECT_ID" \
  --region="$GCP_REGION" \
  --gcs-location="$TEMPLATE_GCS_LOCATION" \
  --staging-location="${DATAFLOW_TEMP_BUCKET%/}/staging" \
  --parameters="${INPUT_PARAM},outputTableSpec=${OUTPUT_TABLE_SPEC}"

cat <<'NOTE'

Notes:
- BigQuery destination table must already exist.
- The JSON message keys from Pub/Sub must match BigQuery column names.
- Required fields should always be present in each event payload.
NOTE
