// Seed script for Prime CRM
// Uses direct database URL for Prisma 7 compatibility

import 'dotenv/config';
import bcrypt from 'bcryptjs';
import pg from 'pg';
import { v4 as uuidv4 } from 'uuid';

const { Pool } = pg;

// Parse the DATABASE_URL
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function main() {
    console.log('🌱 Seeding database...\n');

    const client = await pool.connect();

    try {
        // Create Admin user
        const adminPassword = await bcrypt.hash('admin123', 10);
        const adminId = uuidv4();

        await client.query(`
            INSERT INTO users (id, email, password, display_name, role, active, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
            ON CONFLICT (email) DO NOTHING
        `, [adminId, 'admin@theprimeloanadvisors.com', adminPassword, 'Admin User', 'admin', true]);
        console.log('✅ Created admin user: admin@theprimeloanadvisors.com');

        // Create 4 Advisors
        const advisorPassword = await bcrypt.hash('advisor123', 10);

        const advisors = [
            { email: 'john.smith@theprimeloanadvisors.com', displayName: 'John Smith' },
            { email: 'sarah.johnson@theprimeloanadvisors.com', displayName: 'Sarah Johnson' },
            { email: 'michael.chen@theprimeloanadvisors.com', displayName: 'Michael Chen' },
            { email: 'emily.davis@theprimeloanadvisors.com', displayName: 'Emily Davis' },
        ];

        for (const advisor of advisors) {
            const advisorId = uuidv4();
            await client.query(`
                INSERT INTO users (id, email, password, display_name, role, active, created_at, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
                ON CONFLICT (email) DO NOTHING
            `, [advisorId, advisor.email, advisorPassword, advisor.displayName, 'advisor', true]);
            console.log('✅ Created advisor:', advisor.email);
        }

        // Get John Smith's ID for lead assignment
        const johnResult = await client.query(`SELECT id FROM users WHERE email = $1`, ['john.smith@theprimeloanadvisors.com']);
        const sarahResult = await client.query(`SELECT id FROM users WHERE email = $1`, ['sarah.johnson@theprimeloanadvisors.com']);

        const johnSmithId = johnResult.rows[0]?.id;
        const sarahJohnsonId = sarahResult.rows[0]?.id;

        if (johnSmithId && sarahJohnsonId) {
            const sampleLeads = [
                {
                    firstName: 'Robert',
                    lastName: 'Williams',
                    fullName: 'Robert Williams',
                    phonePrimary: '+15551234567',
                    emailPrimary: 'robert.williams@example.com',
                    status: 'NEW',
                    priority: 'high',
                    advisorId: johnSmithId,
                },
                {
                    firstName: 'Jennifer',
                    lastName: 'Brown',
                    fullName: 'Jennifer Brown',
                    phonePrimary: '+15559876543',
                    emailPrimary: 'jennifer.brown@example.com',
                    status: 'CONTACTED',
                    priority: 'normal',
                    advisorId: johnSmithId,
                    lastContacted: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
                },
                {
                    firstName: 'David',
                    lastName: 'Martinez',
                    fullName: 'David Martinez',
                    phonePrimary: '+15555555555',
                    emailPrimary: 'david.martinez@example.com',
                    status: 'PREQUAL_IN_PROGRESS',
                    priority: 'high',
                    advisorId: sarahJohnsonId,
                    lastContacted: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
                },
                {
                    firstName: 'Lisa',
                    lastName: 'Anderson',
                    fullName: 'Lisa Anderson',
                    phonePrimary: '+15551112222',
                    emailPrimary: 'lisa.anderson@example.com',
                    status: 'NEW',
                    priority: 'normal',
                    advisorId: sarahJohnsonId,
                },
                {
                    firstName: 'James',
                    lastName: 'Taylor',
                    fullName: 'James Taylor',
                    phonePrimary: '+15553334444',
                    emailPrimary: 'james.taylor@example.com',
                    status: 'DOCS_REQUESTED',
                    priority: 'normal',
                    advisorId: johnSmithId,
                    lastContacted: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
                },
            ];

            for (const lead of sampleLeads) {
                const leadId = uuidv4();
                await client.query(`
                    INSERT INTO leads (id, first_name, last_name, full_name, phone_primary, email_primary, status, priority, assigned_advisor_user_id, last_contacted_at, created_at, updated_at)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
                    ON CONFLICT DO NOTHING
                `, [leadId, lead.firstName, lead.lastName, lead.fullName, lead.phonePrimary, lead.emailPrimary, lead.status, lead.priority, lead.advisorId, lead.lastContacted || null]);
                console.log('✅ Created sample lead:', lead.fullName);
            }
        }

        console.log('\n🎉 Seeding complete!\n');
        console.log('📋 Login Credentials:');
        console.log('   Admin: admin@theprimeloanadvisors.com / admin123');
        console.log('   Advisors: [firstname.lastname]@theprimeloanadvisors.com / advisor123');
    } finally {
        client.release();
        await pool.end();
    }
}

main().catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
});
