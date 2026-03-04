/**
 * Backfill script: Populate call_attempt_count and last_call_attempt_at on leads
 * from existing call interactions.
 * 
 * Run with: node scripts/backfill-call-attempts.mjs
 */

import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});

async function main() {
    console.log('🔄 Backfilling call attempt counts from interactions...\n');

    const client = await pool.connect();

    try {
        // Update all leads with their call attempt counts and last call attempt dates
        const result = await client.query(`
            UPDATE leads
            SET 
                call_attempt_count = sub.cnt,
                last_call_attempt_at = sub.last_attempt
            FROM (
                SELECT 
                    lead_id,
                    COUNT(*) as cnt,
                    MAX(occurred_at) as last_attempt
                FROM interactions
                WHERE type = 'call'
                GROUP BY lead_id
            ) sub
            WHERE leads.id = sub.lead_id
        `);

        console.log(`✅ Backfill complete! Updated ${result.rowCount} leads with call attempt data.`);

        // Show summary
        const summary = await client.query(`
            SELECT 
                COUNT(*) FILTER (WHERE call_attempt_count > 0) as with_attempts,
                COUNT(*) FILTER (WHERE call_attempt_count = 0) as without_attempts,
                MAX(call_attempt_count) as max_attempts,
                ROUND(AVG(call_attempt_count) FILTER (WHERE call_attempt_count > 0), 1) as avg_attempts
            FROM leads
        `);

        const s = summary.rows[0];
        console.log(`\n📊 Summary:`);
        console.log(`   Leads with call attempts: ${s.with_attempts}`);
        console.log(`   Leads without attempts:   ${s.without_attempts}`);
        console.log(`   Max attempts on a lead:   ${s.max_attempts || 0}`);
        console.log(`   Avg attempts (non-zero):  ${s.avg_attempts || 0}`);
    } finally {
        client.release();
        await pool.end();
    }
}

main().catch((e) => {
    console.error('❌ Backfill failed:', e);
    process.exit(1);
});
