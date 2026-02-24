import { config } from 'dotenv';
config();

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const ADVISOR_HEADER_PATTERNS = [
    'advisor', 'assigned advisor', 'loan officer', 'lo',
    'advisor name', 'assigned to', 'rep', 'loan advisor',
    'assigned advisor name'
];

function isAdvisorKey(key) {
    const normalized = key.toLowerCase().trim().replace(/[_\-\s]+/g, ' ');
    return ADVISOR_HEADER_PATTERNS.some(p => normalized === p || normalized.includes(p));
}

async function main() {
    try {
        // Get all active advisors
        const advisors = await prisma.user.findMany({
            where: { role: 'advisor', active: true },
            select: { id: true, displayName: true, email: true }
        });

        console.log(`\n=== Active Advisors in System ===`);
        advisors.forEach(a => console.log(`  - ${a.displayName} (${a.email})`));

        if (advisors.length === 0) {
            console.log('\nNo active advisors found. Exiting.');
            return;
        }

        // Find leads with no advisor but with rawImportPayload
        const unassignedLeads = await prisma.lead.findMany({
            where: {
                assignedAdvisorUserId: null,
                rawImportPayload: { not: undefined }
            },
            select: {
                id: true,
                rawImportPayload: true,
                fullName: true,
                firstName: true,
                lastName: true,
            }
        });

        const totalLeads = await prisma.lead.count();
        const totalUnassigned = await prisma.lead.count({ where: { assignedAdvisorUserId: null } });

        console.log(`\n=== Lead Stats ===`);
        console.log(`  Total leads: ${totalLeads}`);
        console.log(`  Unassigned leads: ${totalUnassigned}`);
        console.log(`  Unassigned with import payload: ${unassignedLeads.length}`);

        let matched = 0;
        let unmatched = 0;
        const unmatchedValues = [];
        const matchedDetails = [];

        for (const lead of unassignedLeads) {
            const payload = lead.rawImportPayload;
            if (!payload || typeof payload !== 'object') continue;

            // Find advisor value
            let advisorValue = null;
            for (const [key, value] of Object.entries(payload)) {
                if (isAdvisorKey(key) && value) {
                    advisorValue = String(value).trim();
                    break;
                }
            }

            if (!advisorValue) continue;

            const advisorLower = advisorValue.toLowerCase();

            // 1. Exact match on displayName or email
            let matchedAdvisor = advisors.find(a =>
                a.displayName.toLowerCase() === advisorLower ||
                a.email.toLowerCase() === advisorLower
            );

            // 2. Partial match: first name or last name
            if (!matchedAdvisor) {
                const partialMatches = advisors.filter(a => {
                    const parts = a.displayName.toLowerCase().split(/\s+/);
                    return parts.some(part => part === advisorLower);
                });
                if (partialMatches.length === 1) {
                    matchedAdvisor = partialMatches[0];
                }
            }

            // 3. Contains match
            if (!matchedAdvisor) {
                const containsMatches = advisors.filter(a =>
                    a.displayName.toLowerCase().includes(advisorLower) ||
                    advisorLower.includes(a.displayName.toLowerCase())
                );
                if (containsMatches.length === 1) {
                    matchedAdvisor = containsMatches[0];
                }
            }

            const leadName = lead.fullName || `${lead.firstName || ''} ${lead.lastName || ''}`.trim() || lead.id;

            if (matchedAdvisor) {
                await prisma.lead.update({
                    where: { id: lead.id },
                    data: { assignedAdvisorUserId: matchedAdvisor.id }
                });
                matched++;
                matchedDetails.push({ leadName, advisorValue, matchedTo: matchedAdvisor.displayName });
            } else {
                unmatched++;
                unmatchedValues.push({ leadName, advisorValue });
            }
        }

        console.log(`\n=== Backfill Results ===`);
        console.log(`  Leads matched & updated: ${matched}`);
        console.log(`  Leads with unmatched advisor value: ${unmatched}`);

        if (matchedDetails.length > 0) {
            console.log(`\n--- Matched Leads (first 20) ---`);
            matchedDetails.slice(0, 20).forEach(m =>
                console.log(`  "${m.leadName}" -> advisor "${m.advisorValue}" matched to "${m.matchedTo}"`)
            );
            if (matchedDetails.length > 20) console.log(`  ... and ${matchedDetails.length - 20} more`);
        }

        if (unmatchedValues.length > 0) {
            console.log(`\n--- Unmatched Leads (first 20) ---`);
            unmatchedValues.slice(0, 20).forEach(u =>
                console.log(`  "${u.leadName}" -> advisor value "${u.advisorValue}" NOT FOUND`)
            );
            if (unmatchedValues.length > 20) console.log(`  ... and ${unmatchedValues.length - 20} more`);

            const unique = [...new Set(unmatchedValues.map(u => u.advisorValue))];
            console.log(`\n--- Unique unmatched advisor values ---`);
            unique.forEach(v => console.log(`  - "${v}"`));
        }

        console.log(`\nDone!`);
    } finally {
        await prisma.$disconnect();
        await pool.end();
    }
}

main().catch(e => {
    console.error('Error:', e);
    process.exit(1);
});
