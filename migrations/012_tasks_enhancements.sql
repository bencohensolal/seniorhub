-- Migration 012: Enhance tasks with duration and new reminder format
-- Purpose: Add duration field to tasks and support appointment-style reminders

BEGIN;

-- Add duration column to tasks table
ALTER TABLE tasks
  ADD COLUMN duration INTEGER; -- Duration in minutes

COMMENT ON COLUMN tasks.duration IS 'Optional task duration in minutes';

-- Modify task_reminders table to support both legacy and new formats
-- Legacy: time + days_of_week (for recurring tasks)
-- New: trigger_before + custom_message (for tasks with due date/time)

-- Make existing columns nullable
ALTER TABLE task_reminders
  ALTER COLUMN time DROP NOT NULL,
  ALTER COLUMN days_of_week DROP NOT NULL;

-- Add new columns for appointment-style reminders
ALTER TABLE task_reminders
  ADD COLUMN trigger_before INTEGER, -- Minutes before task due date/time
  ADD COLUMN custom_message TEXT;

-- Add constraint: must have either legacy format OR new format (not both)
ALTER TABLE task_reminders
  ADD CONSTRAINT reminder_format_check CHECK (
    (time IS NOT NULL AND days_of_week IS NOT NULL AND trigger_before IS NULL AND custom_message IS NULL)
    OR
    (time IS NULL AND days_of_week IS NULL AND trigger_before IS NOT NULL)
  );

COMMENT ON COLUMN task_reminders.trigger_before IS 'Minutes before task due date/time to trigger reminder (for appointment-style reminders)';
COMMENT ON COLUMN task_reminders.custom_message IS 'Optional custom message for the reminder';
COMMENT ON CONSTRAINT reminder_format_check ON task_reminders IS 'Ensures reminder uses either legacy format (time+daysOfWeek) OR new format (triggerBefore), not both';

COMMIT;
