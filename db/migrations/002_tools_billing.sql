CREATE TABLE IF NOT EXISTS subscription_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
  billing_interval TEXT NOT NULL CHECK (billing_interval IN ('month', 'year')),
  max_properties INTEGER NOT NULL CHECK (max_properties > 0),
  stripe_price_id TEXT,
  tools_included TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS property_tools (
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  tool_key TEXT NOT NULL CHECK (
    tool_key IN (
      'uptime_monitor',
      'analytics',
      'user_journeys',
      'data_protection',
      'backups',
      'error_logging',
      'event_logging',
      'visual_regression'
    )
  ),
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (property_id, tool_key)
);

ALTER TABLE subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_plan_check;

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS subscription_type_id UUID REFERENCES subscription_types(id) ON DELETE SET NULL;

ALTER TABLE entitlements
  ADD COLUMN IF NOT EXISTS tools_enabled TEXT[] NOT NULL DEFAULT '{}';

INSERT INTO subscription_types (
  name,
  description,
  price_cents,
  billing_interval,
  max_properties,
  stripe_price_id,
  tools_included,
  sort_order
)
VALUES
  (
    'Free',
    'Basic monitoring and event logging for a single property.',
    0,
    'month',
    1,
    NULL,
    ARRAY['uptime_monitor', 'event_logging']::TEXT[],
    0
  ),
  (
    'Starter',
    'Expanded toolset for small teams running multiple properties.',
    4900,
    'month',
    5,
    NULL,
    ARRAY['uptime_monitor', 'analytics', 'event_logging', 'error_logging']::TEXT[],
    1
  ),
  (
    'Pro',
    'Full observability stack with data protection and backups.',
    9900,
    'month',
    20,
    NULL,
    ARRAY['uptime_monitor', 'analytics', 'user_journeys', 'data_protection', 'backups', 'error_logging', 'event_logging']::TEXT[],
    2
  ),
  (
    'Business',
    'Complete platform access including visual regression monitoring.',
    19900,
    'month',
    100,
    NULL,
    ARRAY['uptime_monitor', 'analytics', 'user_journeys', 'data_protection', 'backups', 'error_logging', 'event_logging', 'visual_regression']::TEXT[],
    3
  )
ON CONFLICT (name) DO NOTHING;

UPDATE subscriptions s
SET subscription_type_id = st.id
FROM subscription_types st
WHERE s.subscription_type_id IS NULL
  AND UPPER(s.plan) = UPPER(st.name);

UPDATE entitlements e
SET
  max_properties = st.max_properties,
  tools_enabled = st.tools_included
FROM subscriptions s
JOIN subscription_types st ON st.id = s.subscription_type_id
WHERE e.org_id = s.org_id;

DROP TRIGGER IF EXISTS subscription_types_set_updated_at ON subscription_types;
CREATE TRIGGER subscription_types_set_updated_at
BEFORE UPDATE ON subscription_types
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS property_tools_set_updated_at ON property_tools;
CREATE TRIGGER property_tools_set_updated_at
BEFORE UPDATE ON property_tools
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
