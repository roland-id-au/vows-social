-- Add cost tracking for API usage per listing

-- Add cost tracking to discovered_listings
ALTER TABLE discovered_listings ADD COLUMN IF NOT EXISTS api_cost_usd DECIMAL(10, 4) DEFAULT 0;
ALTER TABLE discovered_listings ADD COLUMN IF NOT EXISTS discovery_cost_usd DECIMAL(10, 4) DEFAULT 0;
ALTER TABLE discovered_listings ADD COLUMN IF NOT EXISTS enrichment_cost_usd DECIMAL(10, 4) DEFAULT 0;

-- Add cost tracking to listings
ALTER TABLE listings ADD COLUMN IF NOT EXISTS api_cost_usd DECIMAL(10, 4) DEFAULT 0;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS discovery_cost_usd DECIMAL(10, 4) DEFAULT 0;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS enrichment_cost_usd DECIMAL(10, 4) DEFAULT 0;

-- Add last_error_at to discovery_queue
ALTER TABLE discovery_queue ADD COLUMN IF NOT EXISTS last_error_at TIMESTAMPTZ;

-- Create cost transactions table for detailed tracking
CREATE TABLE IF NOT EXISTS api_cost_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,
  discovery_id UUID REFERENCES discovered_listings(id) ON DELETE SET NULL,
  service TEXT NOT NULL, -- 'perplexity', 'firecrawl', 'google_maps', etc.
  operation TEXT NOT NULL, -- 'discovery', 'enrichment', 'geocoding', etc.
  cost_usd DECIMAL(10, 4) NOT NULL,
  tokens_used INTEGER,
  api_request_id TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_cost_transactions_listing ON api_cost_transactions(listing_id);
CREATE INDEX IF NOT EXISTS idx_api_cost_transactions_discovery ON api_cost_transactions(discovery_id);
CREATE INDEX IF NOT EXISTS idx_api_cost_transactions_service ON api_cost_transactions(service);
CREATE INDEX IF NOT EXISTS idx_api_cost_transactions_created_at ON api_cost_transactions(created_at DESC);

COMMENT ON TABLE api_cost_transactions IS 'Detailed tracking of all API costs per listing';
COMMENT ON COLUMN api_cost_transactions.cost_usd IS 'Cost in USD for this API call';
COMMENT ON COLUMN api_cost_transactions.tokens_used IS 'Number of tokens used (for LLM APIs)';

-- Create view for cost analytics
CREATE OR REPLACE VIEW cost_analytics AS
SELECT
  service,
  operation,
  COUNT(*) as total_calls,
  SUM(cost_usd) as total_cost_usd,
  AVG(cost_usd) as avg_cost_usd,
  SUM(tokens_used) as total_tokens,
  DATE(created_at) as date
FROM api_cost_transactions
GROUP BY service, operation, DATE(created_at)
ORDER BY date DESC, total_cost_usd DESC;

COMMENT ON VIEW cost_analytics IS 'Daily cost breakdown by service and operation';

-- Create view for listing costs
CREATE OR REPLACE VIEW listing_costs AS
SELECT
  dl.id,
  dl.name,
  dl.city,
  dl.country,
  dl.enrichment_status,
  COALESCE(dl.api_cost_usd, 0) as total_cost_usd,
  COALESCE(dl.discovery_cost_usd, 0) as discovery_cost_usd,
  COALESCE(dl.enrichment_cost_usd, 0) as enrichment_cost_usd,
  (
    SELECT COUNT(*)
    FROM api_cost_transactions
    WHERE discovery_id = dl.id
  ) as api_calls_count,
  dl.created_at
FROM discovered_listings dl
ORDER BY dl.api_cost_usd DESC;

COMMENT ON VIEW listing_costs IS 'Cost breakdown per discovered listing';

-- Function to record API cost
CREATE OR REPLACE FUNCTION record_api_cost(
  p_discovery_id UUID,
  p_service TEXT,
  p_operation TEXT,
  p_cost_usd DECIMAL,
  p_tokens_used INTEGER DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_transaction_id UUID;
BEGIN
  -- Insert cost transaction
  INSERT INTO api_cost_transactions (
    discovery_id,
    service,
    operation,
    cost_usd,
    tokens_used,
    metadata
  ) VALUES (
    p_discovery_id,
    p_service,
    p_operation,
    p_cost_usd,
    p_tokens_used,
    p_metadata
  )
  RETURNING id INTO v_transaction_id;

  -- Update discovered_listings costs
  UPDATE discovered_listings
  SET
    api_cost_usd = COALESCE(api_cost_usd, 0) + p_cost_usd,
    discovery_cost_usd = CASE WHEN p_operation = 'discovery' THEN COALESCE(discovery_cost_usd, 0) + p_cost_usd ELSE discovery_cost_usd END,
    enrichment_cost_usd = CASE WHEN p_operation = 'enrichment' THEN COALESCE(enrichment_cost_usd, 0) + p_cost_usd ELSE enrichment_cost_usd END
  WHERE id = p_discovery_id;

  RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION record_api_cost IS 'Record an API cost transaction and update listing totals';

-- Grant permissions
GRANT SELECT ON api_cost_transactions TO authenticated;
GRANT SELECT ON cost_analytics TO authenticated;
GRANT SELECT ON listing_costs TO authenticated;

GRANT ALL ON api_cost_transactions TO service_role;
