-- Migration 007: Add senior_id to medications table
-- Purpose: Link each medication to a specific household member (senior)
-- A medication must be assigned to a senior member

BEGIN;

-- Add senior_id column (nullable initially to allow migration of existing data)
ALTER TABLE medications
ADD COLUMN senior_id UUID REFERENCES household_members(id) ON DELETE CASCADE;

-- Add index for querying medications by senior
CREATE INDEX idx_medications_senior ON medications(senior_id);

-- Add comment
COMMENT ON COLUMN medications.senior_id IS 'ID of the household member (senior) this medication is prescribed for';

COMMIT;
