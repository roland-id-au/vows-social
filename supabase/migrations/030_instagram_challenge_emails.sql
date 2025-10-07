-- Instagram Challenge Emails Table
-- Stores challenge emails from Instagram for automated code extraction

CREATE TABLE IF NOT EXISTS instagram_challenge_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Email metadata
  from_email TEXT NOT NULL,
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_text TEXT,
  body_html TEXT,

  -- Extracted challenge info
  challenge_code TEXT,
  challenge_type TEXT, -- 'security_code', 'verification', etc.
  extracted_at TIMESTAMPTZ,

  -- Processing status
  status TEXT DEFAULT 'pending', -- 'pending', 'extracted', 'submitted', 'failed'
  submitted_at TIMESTAMPTZ,
  error_message TEXT,

  -- Metadata
  raw_email_data JSONB,

  -- Indexes
  created_at_idx TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_challenge_emails_status
  ON instagram_challenge_emails(status)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_challenge_emails_created
  ON instagram_challenge_emails(created_at DESC);

-- Add RLS policies
ALTER TABLE instagram_challenge_emails ENABLE ROW LEVEL SECURITY;

-- Service role can do everything
CREATE POLICY "Service role full access"
  ON instagram_challenge_emails
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Comment
COMMENT ON TABLE instagram_challenge_emails IS 'Stores Instagram challenge/verification emails for automated code extraction and submission';
