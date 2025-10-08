-- Enable RLS on lock table
ALTER TABLE instagram_api_lock ENABLE ROW LEVEL SECURITY;

-- Allow service role to do everything
CREATE POLICY "Service role can manage lock" ON instagram_api_lock
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Allow anon role to read lock status
CREATE POLICY "Allow read lock status" ON instagram_api_lock
  FOR SELECT
  TO anon
  USING (true);
