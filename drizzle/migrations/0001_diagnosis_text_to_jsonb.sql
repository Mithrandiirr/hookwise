-- Convert diagnosis column from text to jsonb.
-- Existing rows contain JSON-encoded strings, so the USING cast handles them.
-- Rows with NULL or invalid JSON default to NULL.
ALTER TABLE anomalies
  ALTER COLUMN diagnosis
  TYPE jsonb
  USING diagnosis::jsonb;
