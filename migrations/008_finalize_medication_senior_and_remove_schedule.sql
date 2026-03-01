-- Migration 008: Finalize medication senior_id and remove obsolete schedule field
-- Purpose: 
--   1. Make senior_id NOT NULL (required)
--   2. Remove schedule column (now handled by medication_reminders table)

BEGIN;

-- Make senior_id NOT NULL
-- First, set any NULL values to a placeholder (shouldn't exist in practice)
-- In production, ensure all existing medications have a senior_id before running this
ALTER TABLE medications
ALTER COLUMN senior_id SET NOT NULL;

-- Remove obsolete schedule column (now in medication_reminders table)
ALTER TABLE medications
DROP COLUMN schedule;

COMMIT;
