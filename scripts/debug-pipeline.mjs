import 'dotenv/config';
import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

// Simulate exactly what the Prisma Kanban query does
const result = await pool.query(`
    SELECT 
        l.id, l.first_name, l.last_name, l.full_name, 
        l.phone_primary, l.email_primary, l.status, l.priority,
        l.last_contacted_at, l.status_updated_at, l.pipeline
    FROM leads l
    WHERE l.archived = false
      AND l.pipeline = 'cold_leads'
      AND l.status = 'NEW'
    ORDER BY l.priority DESC, l.last_contacted_at ASC
    LIMIT 5
`);

console.log(`Found ${result.rowCount} leads:`);
console.log(JSON.stringify(result.rows, null, 2));

await pool.end();
