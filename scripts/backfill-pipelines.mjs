// One-time script to backfill the `pipeline` field on existing leads
// Run with: node scripts/backfill-pipelines.mjs

import 'dotenv/config';
import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function backfill() {
    const client = await pool.connect();
    try {
        console.log('Starting pipeline backfill...\n');

        // 1. Set processing pipeline for loan-lifecycle statuses
        const processResult = await client.query(`
            UPDATE leads
            SET pipeline = 'processing'
            WHERE status IN ('SUBMITTED_TO_LENDER', 'UNDERWRITING', 'CONDITIONAL_APPROVAL', 'CLEAR_TO_CLOSE', 'CLOSED_FUNDED')
              AND pipeline = 'cold_leads'
        `);
        console.log(`✅ Set ${processResult.rowCount} leads to 'processing' pipeline`);

        // 2. Set warm_leads pipeline for pre-qual/docs statuses
        const warmResult = await client.query(`
            UPDATE leads
            SET pipeline = 'warm_leads'
            WHERE status IN ('PREQUAL_IN_PROGRESS', 'DOCS_REQUESTED', 'DOCS_RECEIVED')
              AND pipeline = 'cold_leads'
        `);
        console.log(`✅ Set ${warmResult.rowCount} leads to 'warm_leads' pipeline`);

        // 3. For CONTACTED leads with 3+ interactions, consider them warm
        const contactedWarmResult = await client.query(`
            UPDATE leads
            SET pipeline = 'warm_leads'
            WHERE status = 'CONTACTED'
              AND pipeline = 'cold_leads'
              AND id IN (
                  SELECT lead_id
                  FROM interactions
                  GROUP BY lead_id
                  HAVING COUNT(*) >= 3
              )
        `);
        console.log(`✅ Set ${contactedWarmResult.rowCount} CONTACTED leads with 3+ interactions to 'warm_leads' pipeline`);

        // 4. Leave NEW, ATTEMPTED_CONTACT, and remaining CONTACTED as cold_leads (default)
        const coldCount = await client.query(`
            SELECT COUNT(*) FROM leads WHERE pipeline = 'cold_leads'
        `);
        console.log(`ℹ️  ${coldCount.rows[0].count} leads remain in 'cold_leads' pipeline`);

        // 5. Terminal status leads - leave them in whatever pipeline they defaulted to (cold_leads)
        const terminalCount = await client.query(`
            SELECT COUNT(*) FROM leads WHERE status IN ('NOT_INTERESTED', 'UNQUALIFIED', 'LOST', 'DO_NOT_CONTACT')
        `);
        console.log(`ℹ️  ${terminalCount.rows[0].count} leads have terminal statuses (kept in their current pipeline)`);

        // Summary
        const summary = await client.query(`
            SELECT pipeline, COUNT(*) as count
            FROM leads
            GROUP BY pipeline
            ORDER BY pipeline
        `);

        console.log('\n📊 Pipeline Distribution:');
        for (const row of summary.rows) {
            console.log(`   ${row.pipeline}: ${row.count} leads`);
        }

        console.log('\n✅ Pipeline backfill complete!');
    } catch (error) {
        console.error('❌ Error during backfill:', error);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

backfill();
