#!/usr/bin/env bash
set -euo pipefail

: "${GCP_PROJECT_ID:?GCP_PROJECT_ID is required}"
PUBSUB_TOPIC_EVENTS="${PUBSUB_TOPIC_EVENTS:-events}"
CREATE_DLQ_TOPIC="${CREATE_DLQ_TOPIC:-true}"

printf "Using project: %s\n" "$GCP_PROJECT_ID"
if gcloud pubsub topics describe "$PUBSUB_TOPIC_EVENTS" --project="$GCP_PROJECT_ID" >/dev/null 2>&1; then
  printf "Topic already exists: %s\n" "$PUBSUB_TOPIC_EVENTS"
else
  printf "Creating topic: %s\n" "$PUBSUB_TOPIC_EVENTS"
  gcloud pubsub topics create "$PUBSUB_TOPIC_EVENTS" --project="$GCP_PROJECT_ID"
fi

if [[ "$CREATE_DLQ_TOPIC" == "true" ]]; then
  if gcloud pubsub topics describe "${PUBSUB_TOPIC_EVENTS}_dlq" --project="$GCP_PROJECT_ID" >/dev/null 2>&1; then
    printf "DLQ topic already exists: %s\n" "${PUBSUB_TOPIC_EVENTS}_dlq"
  else
    printf "Creating DLQ topic: %s\n" "${PUBSUB_TOPIC_EVENTS}_dlq"
    gcloud pubsub topics create "${PUBSUB_TOPIC_EVENTS}_dlq" --project="$GCP_PROJECT_ID"
  fi
fi

printf "Done.\n"
