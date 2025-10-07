CREATE TABLE IF NOT EXISTS instagram_challenge_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, completed, failed
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  error_message TEXT
);

-- Only keep the most recent challenge per username
CREATE UNIQUE INDEX IF NOT EXISTS idx_challenge_state_username ON instagram_challenge_state(username);
