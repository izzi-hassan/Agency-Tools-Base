# GCP Analytics Infra (Pub/Sub -> Dataflow -> BigQuery)

This folder contains minimal scripts for a streaming analytics pipeline using the Google-provided Dataflow template.

## Required APIs

Enable these APIs in your GCP project:

- Cloud Pub/Sub API
- Dataflow API
- BigQuery API
- Cloud Storage API

Example:

```bash
gcloud services enable \
  pubsub.googleapis.com \
  dataflow.googleapis.com \
  bigquery.googleapis.com \
  storage.googleapis.com \
  --project="$GCP_PROJECT_ID"
```

## Required IAM roles

For the operator identity running setup/scripts:

- `roles/pubsub.admin`
- `roles/dataflow.admin`
- `roles/bigquery.dataEditor`
- `roles/bigquery.jobUser`
- `roles/storage.admin` (for temp bucket setup)
- `roles/iam.serviceAccountUser` (if specifying a worker service account)

For the Dataflow worker service account (runtime identity):

- `roles/dataflow.worker`
- `roles/pubsub.subscriber`
- `roles/bigquery.dataEditor`
- `roles/bigquery.jobUser`
- `roles/storage.objectAdmin` (on temp/staging bucket)

## Environment variables

These are used by scripts and app code:

- `GCP_PROJECT_ID` (required)
- `GCP_REGION` (default: `us-central1`)
- `PUBSUB_TOPIC_EVENTS` (default: `events`)
- `BQ_DATASET` (default: `webtools`)
- `BQ_TABLE_EVENTS_RAW` (default: `events_raw`)
- `DATAFLOW_TEMP_BUCKET` (required for `dataflow.sh`, e.g. `gs://my-dataflow-temp-bucket`)

## Publisher authentication

Local development (Application Default Credentials):

```bash
gcloud auth application-default login
```

Production should use a GCP service account attached to the runtime workload (later via GKE Workload Identity).

## Create resources

1. Set env vars:

```bash
export GCP_PROJECT_ID="your-project-id"
export GCP_REGION="us-central1"
export PUBSUB_TOPIC_EVENTS="events"
export BQ_DATASET="webtools"
export BQ_TABLE_EVENTS_RAW="events_raw"
export DATAFLOW_TEMP_BUCKET="gs://your-dataflow-temp-bucket"
```

2. Create temp bucket (one-time):

```bash
gsutil mb -l "$GCP_REGION" "$DATAFLOW_TEMP_BUCKET"
```

3. Create BigQuery dataset/table:

```bash
bq --project_id="$GCP_PROJECT_ID" query --use_legacy_sql=false < infra/gcp/bigquery.sql
```

4. Create Pub/Sub topic (and optional DLQ topic):

```bash
bash infra/gcp/pubsub.sh
```

## Run Dataflow template job

Use the Google-provided template `PubSub_to_BigQuery`:

```bash
bash infra/gcp/dataflow.sh
```

By default this uses input topic `projects/$GCP_PROJECT_ID/topics/$PUBSUB_TOPIC_EVENTS`.

To use a subscription instead:

```bash
INPUT_SUBSCRIPTION="events-sub" bash infra/gcp/dataflow.sh
```

## Important template requirement

The BigQuery destination table must already exist, and incoming Pub/Sub JSON keys must match table column names.
