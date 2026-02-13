-- Add casier judiciaire (criminal background check) for drivers
-- Required to go online

ALTER TABLE drivers ADD COLUMN IF NOT EXISTS casier_judiciaire TEXT;
