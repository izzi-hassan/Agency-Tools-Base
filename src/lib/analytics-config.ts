export const analyticsConfig = {
  projectId: process.env.GCP_PROJECT_ID ?? "",
  region: process.env.GCP_REGION ?? "us-central1",
  topic: process.env.PUBSUB_TOPIC_EVENTS ?? "events",
  dataset: process.env.BQ_DATASET ?? "webtools",
  tableEventsRaw: process.env.BQ_TABLE_EVENTS_RAW ?? "events_raw"
};
