import { PubSub } from "@google-cloud/pubsub";
import { analyticsConfig } from "@/lib/analytics-config";

export type EventEnvelope = {
  event_id: string;
  event_name: string;
  occurred_at: string;
  received_at: string;
  org_id: string;
  property_id?: string;
  user_id?: string;
  session_id?: string;
  source?: string;
  payload?: Record<string, unknown>;
};

const projectId = analyticsConfig.projectId;
const topicName = analyticsConfig.topic;

const pubsub = new PubSub({ projectId: projectId || undefined });

export async function publishEvent(event: EventEnvelope): Promise<void> {
  const message: EventEnvelope = {
    event_id: event.event_id,
    event_name: event.event_name,
    occurred_at: event.occurred_at,
    received_at: event.received_at,
    org_id: event.org_id,
    property_id: event.property_id,
    user_id: event.user_id,
    session_id: event.session_id,
    source: event.source,
    payload: event.payload
  };

  const data = Buffer.from(JSON.stringify(message));
  await pubsub.topic(topicName).publishMessage({ data });
}
