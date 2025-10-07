-- Test if we can insert into discovered_listings with the correct columns

-- First, check current schema
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'discovered_listings'
ORDER BY ordinal_position;

-- Try a manual insert with the same columns the discovery processor uses
INSERT INTO discovered_listings (
  name,
  location,
  city,
  country,
  type,
  enrichment_status
)
VALUES (
  'Test Venue Manual',
  'Test City, Australia',
  'Test City',
  'Australia',
  'venue',
  'pending'
)
RETURNING id, name, city;

-- Clean up test data
DELETE FROM discovered_listings WHERE name = 'Test Venue Manual';
