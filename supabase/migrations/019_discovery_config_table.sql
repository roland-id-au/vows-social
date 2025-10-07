-- Create discovery configuration table
-- Stores vendor discovery locations and service types

CREATE TABLE IF NOT EXISTS discovery_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state TEXT NOT NULL,
  city TEXT,
  service_type TEXT NOT NULL,
  priority INTEGER DEFAULT 5,
  interval_hours INTEGER DEFAULT 24,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Prevent duplicate configs
  UNIQUE(state, city, service_type)
);

CREATE INDEX idx_discovery_config_enabled ON discovery_config(enabled) WHERE enabled = true;
CREATE INDEX idx_discovery_config_state ON discovery_config(state);
CREATE INDEX idx_discovery_config_service_type ON discovery_config(service_type);

-- Seed with initial configuration
INSERT INTO discovery_config (state, city, service_type, priority, interval_hours) VALUES
  -- NSW - Priority 1
  ('NSW', 'Sydney', 'venue', 1, 24),
  ('NSW', 'Newcastle', 'venue', 1, 24),
  ('NSW', 'Wollongong', 'venue', 1, 24),
  ('NSW', 'Hunter Valley', 'venue', 1, 24),
  ('NSW', 'Byron Bay', 'venue', 1, 24),

  -- VIC - Priority 1
  ('VIC', 'Melbourne', 'venue', 1, 24),
  ('VIC', 'Geelong', 'venue', 1, 24),
  ('VIC', 'Yarra Valley', 'venue', 1, 24),
  ('VIC', 'Mornington Peninsula', 'venue', 1, 24),

  -- QLD - Priority 1
  ('QLD', 'Brisbane', 'venue', 1, 24),
  ('QLD', 'Gold Coast', 'venue', 1, 24),
  ('QLD', 'Sunshine Coast', 'venue', 1, 24),
  ('QLD', 'Cairns', 'venue', 1, 24),
  ('QLD', 'Whitsundays', 'venue', 1, 24),

  -- SA - Priority 2
  ('SA', 'Adelaide', 'venue', 2, 48),
  ('SA', 'Barossa Valley', 'venue', 2, 48),
  ('SA', 'McLaren Vale', 'venue', 2, 48),

  -- WA - Priority 2
  ('WA', 'Perth', 'venue', 2, 48),
  ('WA', 'Margaret River', 'venue', 2, 48),
  ('WA', 'Swan Valley', 'venue', 2, 48),

  -- TAS - Priority 3
  ('TAS', 'Hobart', 'venue', 3, 72),
  ('TAS', 'Launceston', 'venue', 3, 72),

  -- ACT - Priority 3
  ('ACT', 'Canberra', 'venue', 3, 72),

  -- NT - Priority 3
  ('NT', 'Darwin', 'venue', 3, 72)
ON CONFLICT (state, city, service_type) DO NOTHING;
