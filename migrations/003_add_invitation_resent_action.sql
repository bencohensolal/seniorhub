-- Migration 003: Add 'invitation_resent' action to audit_events
--
-- This migration adds support for logging invitation resend operations
-- in the audit_events table.

-- Drop the existing CHECK constraint
ALTER TABLE audit_events DROP CONSTRAINT IF EXISTS audit_events_action_check;

-- Add the new CHECK constraint with the additional action
ALTER TABLE audit_events ADD CONSTRAINT audit_events_action_check 
  CHECK (action IN (
    'invitation_created',
    'invitation_accepted',
    'invitation_cancelled',
    'invitation_resent'
  ));
