-- Create lock table for Instagram API to prevent concurrent access
CREATE TABLE IF NOT EXISTS instagram_api_lock (
  id TEXT PRIMARY KEY DEFAULT 'singleton',
  locked_at TIMESTAMPTZ,
  locked_by TEXT,
  released_at TIMESTAMPTZ,
  CONSTRAINT singleton_check CHECK (id = 'singleton')
);

-- Insert the single row
INSERT INTO instagram_api_lock (id) VALUES ('singleton')
ON CONFLICT (id) DO NOTHING;

-- Function to acquire lock (returns true if acquired, false if already locked)
CREATE OR REPLACE FUNCTION acquire_instagram_lock(lock_owner TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  acquired BOOLEAN;
  lock_age INTERVAL;
BEGIN
  -- Check if lock is stale (older than 1 hour = potential crashed worker)
  SELECT EXTRACT(EPOCH FROM (NOW() - locked_at)) INTO lock_age
  FROM instagram_api_lock
  WHERE id = 'singleton' AND locked_at IS NOT NULL;

  -- Auto-release stale locks
  IF lock_age > 3600 THEN
    UPDATE instagram_api_lock
    SET locked_at = NULL, locked_by = NULL, released_at = NOW()
    WHERE id = 'singleton';
  END IF;

  -- Try to acquire lock
  UPDATE instagram_api_lock
  SET locked_at = NOW(), locked_by = lock_owner, released_at = NULL
  WHERE id = 'singleton' AND locked_at IS NULL
  RETURNING TRUE INTO acquired;

  RETURN COALESCE(acquired, FALSE);
END;
$$;

-- Function to release lock
CREATE OR REPLACE FUNCTION release_instagram_lock()
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE instagram_api_lock
  SET locked_at = NULL, locked_by = NULL, released_at = NOW()
  WHERE id = 'singleton';
END;
$$;
