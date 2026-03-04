-- Add reactivation tracking to invitations
ALTER TABLE household_invitations
ADD COLUMN IF NOT EXISTS reactivation_count INTEGER NOT NULL DEFAULT 0;

-- Add index for efficient querying of reactivated invitations
CREATE INDEX IF NOT EXISTS idx_household_invitations_reactivation
ON household_invitations (household_id, status, reactivation_count);
