import pg from 'pg';
import { env } from '../config/env.js';

const { Pool } = pg;

async function clearDatabase() {
  if (!env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not configured');
  }

  const pool = new Pool({ connectionString: env.DATABASE_URL });

  try {
    console.info('🗑️  Clearing all data from database...');
    console.info('Database:', env.DATABASE_URL.split('@')[1]?.split('/')[0]);

    await pool.query('BEGIN');

    // Clear all tables in reverse dependency order
    await pool.query('TRUNCATE TABLE audit_events CASCADE');
    console.info('✅ Cleared audit_events');

    await pool.query('TRUNCATE TABLE household_invitations CASCADE');
    console.info('✅ Cleared household_invitations');

    await pool.query('TRUNCATE TABLE household_members CASCADE');
    console.info('✅ Cleared household_members');

    await pool.query('TRUNCATE TABLE households CASCADE');
    console.info('✅ Cleared households');

    await pool.query('COMMIT');

    // Verify tables are empty
    const result = await pool.query(`
      SELECT 'households' as table_name, COUNT(*) as count FROM households
      UNION ALL
      SELECT 'household_members', COUNT(*) FROM household_members
      UNION ALL
      SELECT 'household_invitations', COUNT(*) FROM household_invitations
      UNION ALL
      SELECT 'audit_events', COUNT(*) FROM audit_events
    `);

    console.info('\n📊 Verification:');
    result.rows.forEach((row) => {
      console.info(`  ${row.table_name}: ${row.count} rows`);
    });

    console.info('\n✨ Database cleared successfully!');
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('❌ Error clearing database:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

clearDatabase().catch((error) => {
  console.error(error);
  process.exit(1);
});
