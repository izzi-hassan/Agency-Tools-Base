-- Create dataset and raw events table for Pub/Sub -> Dataflow -> BigQuery ingestion.
-- If your BigQuery environment does not support JSON type, change `payload JSON`
-- to `payload STRING` and send serialized JSON text in that field.

CREATE SCHEMA IF NOT EXISTS `webtools`;

CREATE TABLE IF NOT EXISTS `webtools.events_raw` (
  event_id STRING NOT NULL,
  event_name STRING NOT NULL,
  occurred_at TIMESTAMP NOT NULL,
  received_at TIMESTAMP NOT NULL,
  org_id STRING NOT NULL,
  property_id STRING,
  user_id STRING,
  session_id STRING,
  source STRING,
  payload JSON
)
PARTITION BY DATE(occurred_at)
CLUSTER BY org_id, property_id, event_name;
