-- Clear stale data from listings and discoveries
-- This migration removes old test data to start fresh

-- Delete all notification queue items
TRUNCATE TABLE notification_queue CASCADE;

-- Delete all enrichment queue items
TRUNCATE TABLE enrichment_queue CASCADE;

-- Delete all discovered listings
TRUNCATE TABLE discovered_listings CASCADE;

-- Delete all listings
TRUNCATE TABLE listings CASCADE;

-- Delete all Instagram accounts (optional - uncomment if needed)
-- TRUNCATE TABLE instagram_accounts CASCADE;

-- Reset sequences if needed
-- ALTER SEQUENCE listings_id_seq RESTART WITH 1;

COMMENT ON TABLE listings IS 'Production listings table - cleared and ready for fresh enrichment';
