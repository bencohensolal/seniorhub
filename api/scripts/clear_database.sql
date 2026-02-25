-- Clear all data from all tables (keeps schema)
-- Use TRUNCATE for performance and to reset sequences

TRUNCATE TABLE audit_events CASCADE;
TRUNCATE TABLE household_invitations CASCADE;
TRUNCATE TABLE household_members CASCADE;
TRUNCATE TABLE households CASCADE;

-- Keep schema_migrations to maintain migration history
-- If you want to reset migrations too, uncomment:
-- TRUNCATE TABLE schema_migrations CASCADE;

-- Verify tables are empty
SELECT 'households' as table_name, COUNT(*) as count FROM households
UNION ALL
SELECT 'household_members', COUNT(*) FROM household_members
UNION ALL
SELECT 'household_invitations', COUNT(*) FROM household_invitations
UNION ALL
SELECT 'audit_events', COUNT(*) FROM audit_events;
