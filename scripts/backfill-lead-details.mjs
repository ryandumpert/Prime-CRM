// Backfill script to populate dateOfEntry, loanProduct, and leadSource from spreadsheet
// Run with: node scripts/backfill-lead-details.mjs

import 'dotenv/config';
import pg from 'pg';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

function normalizePhone(raw) {
    if (!raw) return null;
    const digits = String(raw).replace(/\D/g, '');
    if (digits.length === 10) return `+1${digits}`;
    if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
    if (digits.length > 7) return `+${digits}`;
    return null;
}

function normalizeEmail(raw) {
    if (!raw) return null;
    const cleaned = raw.toLowerCase().trim().replace(/\r\n|\n|\r/g, '');
    return cleaned || null;
}

async function main() {
    const client = await pool.connect();

    try {
        const wb = XLSX.readFile('C:\\Users\\Ryan Dumpert\\Documents\\leads import.xlsx');
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

        const rows = data.slice(1);

        // Column indices from the spreadsheet
        const dateIdx = 0;        // "Date of Entry"
        const phoneIdx = 3;       // "Phone"
        const emailIdx = 4;       // "Email"
        const loanProductIdx = 5; // "Loan Product"
        const sourceIdx = 12;     // "Source"

        console.log(`Processing ${rows.length} rows...\n`);

        let updated = 0;
        let notFound = 0;
        let skipped = 0;

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];

            const hasData = row.some(v => v !== '' && v !== null && v !== undefined);
            if (!hasData) { skipped++; continue; }

            const phone = normalizePhone(row[phoneIdx]);
            const email = normalizeEmail(String(row[emailIdx] || ''));

            // Find existing lead by email or phone
            let leadResult = null;
            if (email) {
                leadResult = await client.query('SELECT id FROM leads WHERE email_primary = $1 LIMIT 1', [email]);
            }
            if ((!leadResult || leadResult.rows.length === 0) && phone) {
                leadResult = await client.query('SELECT id FROM leads WHERE phone_primary = $1 LIMIT 1', [phone]);
            }

            if (!leadResult || leadResult.rows.length === 0) {
                notFound++;
                continue;
            }

            const leadId = leadResult.rows[0].id;

            // Parse date of entry
            let dateOfEntry = null;
            if (row[dateIdx]) {
                const rawDate = row[dateIdx];
                if (typeof rawDate === 'number') {
                    const excelEpoch = new Date(1899, 11, 30);
                    dateOfEntry = new Date(excelEpoch.getTime() + rawDate * 86400000);
                } else {
                    const parsed = new Date(String(rawDate));
                    if (!isNaN(parsed.getTime())) dateOfEntry = parsed;
                }
            }

            const loanProduct = row[loanProductIdx] ? String(row[loanProductIdx]).trim().replace(/\r\n|\n|\r/g, '') : null;
            const leadSource = row[sourceIdx] ? String(row[sourceIdx]).trim().replace(/\r\n|\n|\r/g, '') : null;

            // Build SET clause dynamically
            const sets = [];
            const values = [];
            let paramIdx = 1;

            if (dateOfEntry) {
                sets.push(`date_of_entry = $${paramIdx++}`);
                values.push(dateOfEntry);
            }
            if (loanProduct) {
                sets.push(`loan_product = $${paramIdx++}`);
                values.push(loanProduct);
            }
            if (leadSource) {
                sets.push(`lead_source = $${paramIdx++}`);
                values.push(leadSource);
            }

            if (sets.length > 0) {
                values.push(leadId);
                await client.query(
                    `UPDATE leads SET ${sets.join(', ')} WHERE id = $${paramIdx}`,
                    values
                );
                updated++;
            } else {
                skipped++;
            }

            if ((i + 1) % 100 === 0) {
                console.log(`  Progress: ${i + 1}/${rows.length} (updated: ${updated}, not found: ${notFound}, skipped: ${skipped})`);
            }
        }

        console.log(`\n✅ Backfill complete!`);
        console.log(`   Updated: ${updated}`);
        console.log(`   Not found: ${notFound}`);
        console.log(`   Skipped: ${skipped}`);

        // Quick check
        const sample = await client.query(
            'SELECT first_name, last_name, date_of_entry, loan_product, lead_source FROM leads WHERE loan_product IS NOT NULL LIMIT 3'
        );
        console.log('\nSample updated leads:');
        for (const row of sample.rows) {
            console.log(`  ${row.first_name} ${row.last_name}: product=${row.loan_product}, source=${row.lead_source}, date=${row.date_of_entry}`);
        }
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

main();
