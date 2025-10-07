-- More aggressive short name generation - aim for 20 chars max, single line
UPDATE listings
SET short_name = CASE
  -- If title is already very short (< 20 chars), use as is
  WHEN LENGTH(title) <= 20 THEN title

  -- Venues: Just use the main name, drop everything else
  WHEN title ILIKE '%ballroom%' THEN
    TRIM(REGEXP_REPLACE(title, '\s+(ballroom|sydney|wedding|venue|venues|and|&|events?|estate|function|centre|center)(\s+|$)', ' ', 'gi'))

  WHEN title ILIKE '%barracks%' THEN
    TRIM(REGEXP_REPLACE(title, '\s+(wedding|venue|venues|and|&|events?|estate|function|centre|center)(\s+|$)', ' ', 'gi'))

  WHEN category = 'venue' AND title ILIKE '%the %' THEN
    -- Keep "The" if it starts the name, but drop all suffixes
    TRIM(REGEXP_REPLACE(title, '\s+(wedding|venue|venues|and|&|events?|estate|ballroom|function|centre|center)(\s+|$)', ' ', 'gi'))

  WHEN category = 'venue' THEN
    -- For other venues, just remove all common words
    TRIM(REGEXP_REPLACE(title, '\s+(the|wedding|weddings?|venue|venues|and|&|at|events?|estate|ballroom|function|centre|center)(\s+|$)', ' ', 'gi'))

  -- For service providers, just keep the business name
  WHEN category = 'photographer' THEN
    TRIM(REGEXP_REPLACE(title, '\s+(photography|photographer|photo|photos|wedding|weddings?|studio)(\s+|$)', ' ', 'gi'))

  WHEN category = 'videographer' THEN
    TRIM(REGEXP_REPLACE(title, '\s+(videography|videographer|video|films?|wedding|weddings?|studio)(\s+|$)', ' ', 'gi'))

  WHEN category = 'caterer' THEN
    TRIM(REGEXP_REPLACE(title, '\s+(catering|caterers?|co|company|wedding|weddings?|events?)(\s+|$)', ' ', 'gi'))

  WHEN category = 'florist' THEN
    TRIM(REGEXP_REPLACE(title, '\s+(florist|florals?|flowers?|blooms?|wedding|weddings?)(\s+|$)', ' ', 'gi'))

  WHEN category = 'musician' THEN
    TRIM(REGEXP_REPLACE(title, '\s+(music|musicians?|band|entertainment|wedding|weddings?)(\s+|$)', ' ', 'gi'))

  WHEN category = 'stylist' THEN
    TRIM(REGEXP_REPLACE(title, '\s+(styling|stylist|hair|makeup|beauty|wedding|weddings?)(\s+|$)', ' ', 'gi'))

  WHEN category = 'planner' THEN
    TRIM(REGEXP_REPLACE(title, '\s+(planning|planner|events?|co|company|wedding|weddings?)(\s+|$)', ' ', 'gi'))

  -- Default: remove common filler words
  ELSE TRIM(REGEXP_REPLACE(title, '\s+(the|and|&|at|wedding|weddings?|events?|co|company)(\s+|$)', ' ', 'gi'))
END;

-- Truncate to 20 chars max, cutting at word boundary
UPDATE listings
SET short_name = CASE
  WHEN LENGTH(short_name) > 20 THEN
    CASE
      WHEN POSITION(' ' IN SUBSTRING(short_name, 1, 20)) > 0 THEN
        -- Cut at last space before char 20
        LEFT(short_name, 20 - LENGTH(SUBSTRING(short_name FROM '.* ')) + LENGTH(RTRIM(SUBSTRING(short_name FROM '.* '))))
      ELSE
        -- No space found, just hard cut
        LEFT(short_name, 20)
    END
  ELSE short_name
END
WHERE LENGTH(short_name) > 20;

-- Clean up extra spaces
UPDATE listings
SET short_name = REGEXP_REPLACE(short_name, '\s+', ' ', 'g');

-- Trim whitespace
UPDATE listings
SET short_name = TRIM(short_name);

-- If still somehow empty or too short, use first 20 chars of title
UPDATE listings
SET short_name = LEFT(title, 20)
WHERE short_name IS NULL OR short_name = '' OR LENGTH(short_name) < 3;
