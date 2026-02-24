import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function updateEmail() {
    const client = await pool.connect();
    try {
        // Update admin email
        await client.query(`UPDATE users SET email = 'admin@theprimeloanadvisors.com' WHERE email = 'admin@primeloanadvisors.com'`);
        console.log('✅ Admin email updated to admin@theprimeloanadvisors.com');

        // Update advisor emails
        const advisorUpdates = [
            ['john.smith@theprimeloanadvisors.com', 'john.smith@primeloanadvisors.com'],
            ['sarah.johnson@theprimeloanadvisors.com', 'sarah.johnson@primeloanadvisors.com'],
            ['michael.chen@theprimeloanadvisors.com', 'michael.chen@primeloanadvisors.com'],
            ['emily.davis@theprimeloanadvisors.com', 'emily.davis@primeloanadvisors.com'],
        ];

        for (const [newEmail, oldEmail] of advisorUpdates) {
            await client.query(`UPDATE users SET email = $1 WHERE email = $2`, [newEmail, oldEmail]);
            console.log(`✅ Updated ${oldEmail} → ${newEmail}`);
        }

        console.log('\n🎉 All emails updated!');
    } finally {
        client.release();
        await pool.end();
    }
}

updateEmail().catch(console.error);
