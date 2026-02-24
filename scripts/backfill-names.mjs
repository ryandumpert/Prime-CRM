import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Possible first name keys in the raw import payload (case-insensitive check)
const FIRST_NAME_KEYS = ['Fist Name', 'First Name', 'FirstName', 'first_name', 'fist name', 'first name'];

async function main() {
    const leads = await prisma.lead.findMany({
        where: { firstName: null },
        select: { id: true, firstName: true, lastName: true, fullName: true, rawImportPayload: true }
    });

    console.log(`Found ${leads.length} leads with no firstName. Checking raw import payload...`);

    let updated = 0;
    let skipped = 0;

    for (const lead of leads) {
        const payload = lead.rawImportPayload;
        if (!payload || typeof payload !== 'object') {
            skipped++;
            continue;
        }

        // Find first name in the raw payload
        let extractedFirstName = null;
        for (const key of FIRST_NAME_KEYS) {
            if (payload[key] && String(payload[key]).trim()) {
                extractedFirstName = String(payload[key]).trim();
                break;
            }
        }

        // Also try case-insensitive search on all keys
        if (!extractedFirstName) {
            for (const [key, value] of Object.entries(payload)) {
                const normalized = key.toLowerCase().trim().replace(/[_\-\s]+/g, ' ');
                if ((normalized === 'first name' || normalized === 'fist name' || normalized === 'firstname') && value) {
                    extractedFirstName = String(value).trim();
                    break;
                }
            }
        }

        if (!extractedFirstName) {
            skipped++;
            continue;
        }

        // Build full name
        const fullName = `${extractedFirstName} ${lead.lastName || ''}`.trim() || null;

        await prisma.lead.update({
            where: { id: lead.id },
            data: {
                firstName: extractedFirstName,
                fullName: fullName,
            }
        });
        updated++;

        if (updated % 50 === 0) {
            console.log(`  Updated ${updated} leads so far...`);
        }
    }

    console.log(`\nDone! Updated ${updated} leads. Skipped ${skipped} (no first name found in payload).`);
}

main()
    .catch(console.error)
    .finally(async () => {
        await prisma.$disconnect();
        await pool.end();
    });
