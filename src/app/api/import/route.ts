import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import prisma from '@/lib/db';
import * as XLSX from 'xlsx';
import { normalizePhone, normalizeEmail, generateImportHash } from '@/lib/utils';
import { HEADER_PATTERNS, DEFAULT_IMPORT_SOURCE, DEFAULT_SHEET_NAME } from '@/lib/constants';

// Helper to match header patterns (case/whitespace-insensitive)
function matchHeader(header: string, patterns: string[]): boolean {
    const normalized = header.toLowerCase().trim().replace(/[_\-\s]+/g, ' ');
    return patterns.some(p => normalized === p || normalized.includes(p));
}

// POST /api/import - Import leads from spreadsheet
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized - Admin only' }, { status: 401 });
        }

        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        // Create import record
        const importRecord = await prisma.import.create({
            data: {
                sourceName: DEFAULT_IMPORT_SOURCE,
                sheetName: DEFAULT_SHEET_NAME,
            },
        });

        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });

        // Get Sheet1 (per blueprint.md)
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        // Convert to JSON with header row
        const rawData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, {
            header: 1,
            defval: '',
        });

        if (rawData.length < 2) {
            await prisma.import.update({
                where: { id: importRecord.id },
                data: {
                    completedAt: new Date(),
                    rowsFailed: 0,
                    errorLog: [{ message: 'No data rows found' }],
                },
            });
            return NextResponse.json({ error: 'No data rows found in spreadsheet' }, { status: 400 });
        }

        const headers = rawData[0] as string[];
        const dataRows = rawData.slice(1);

        // Get advisors for mapping
        const advisors = await prisma.user.findMany({
            where: { role: 'advisor', active: true },
        });

        // Map column indices dynamically from headers
        let firstNameIdx = -1, lastNameIdx = -1, fullNameIdx = -1, phoneIdx = -1, emailIdx = -1, dateIdx = -1, advisorIdx = -1, loanProductIdx = -1, sourceIdx = -1, notesIdx = -1;

        headers.forEach((header, idx) => {
            if (typeof header !== 'string') return;

            if (matchHeader(header, HEADER_PATTERNS.firstName)) firstNameIdx = idx;
            if (matchHeader(header, HEADER_PATTERNS.lastName)) lastNameIdx = idx;
            if (matchHeader(header, HEADER_PATTERNS.fullName)) fullNameIdx = idx;
            if (matchHeader(header, HEADER_PATTERNS.phone)) phoneIdx = idx;
            if (matchHeader(header, HEADER_PATTERNS.email)) emailIdx = idx;
            if (matchHeader(header, HEADER_PATTERNS.date)) dateIdx = idx;
            if (matchHeader(header, HEADER_PATTERNS.advisor)) advisorIdx = idx;
            if (matchHeader(header, HEADER_PATTERNS.loanProduct)) loanProductIdx = idx;
            if (matchHeader(header, HEADER_PATTERNS.source)) sourceIdx = idx;
            if (matchHeader(header, HEADER_PATTERNS.notes)) notesIdx = idx;
        });

        const errors: any[] = [];
        let rowsInserted = 0;
        let rowsUpdated = 0;
        let rowsFailed = 0;

        for (let i = 0; i < dataRows.length; i++) {
            const row = dataRows[i] as any[];
            const rowIndex = i + 2; // Account for header row and 1-indexing

            try {
                // Build raw payload keyed by header
                const rawPayload: Record<string, any> = {};
                headers.forEach((header, idx) => {
                    if (header && row[idx] !== undefined) {
                        rawPayload[String(header)] = row[idx];
                    }
                });

                // Skip completely empty rows
                const hasData = Object.values(rawPayload).some(v => v !== '' && v !== null && v !== undefined);
                if (!hasData) continue;

                // Extract mapped fields
                const firstName = firstNameIdx >= 0 ? String(row[firstNameIdx] || '') : null;
                const lastName = lastNameIdx >= 0 ? String(row[lastNameIdx] || '') : null;
                let fullName = fullNameIdx >= 0 ? String(row[fullNameIdx] || '') : null;

                // Derive full name if not present
                if (!fullName && (firstName || lastName)) {
                    fullName = `${firstName || ''} ${lastName || ''}`.trim() || null;
                }

                const phonePrimary = phoneIdx >= 0 ? normalizePhone(String(row[phoneIdx] || '')) : null;
                const emailPrimary = emailIdx >= 0 ? normalizeEmail(String(row[emailIdx] || '')) : null;

                // New fields
                const loanProduct = loanProductIdx >= 0 && row[loanProductIdx] ? String(row[loanProductIdx]).trim().replace(/\r\n|\n|\r/g, '') : null;
                const leadSource = sourceIdx >= 0 && row[sourceIdx] ? String(row[sourceIdx]).trim().replace(/\r\n|\n|\r/g, '') : null;
                const notesRaw = notesIdx >= 0 && row[notesIdx] ? String(row[notesIdx]).trim().replace(/\r\n|\n|\r/g, '') : null;

                // Parse date of entry (Excel serial number or date string)
                let dateOfEntry: Date | null = null;
                if (dateIdx >= 0 && row[dateIdx]) {
                    const rawDate = row[dateIdx];
                    if (typeof rawDate === 'number') {
                        // Excel serial date: convert to JS Date
                        // Excel epoch is Jan 0 1900 (with the 1900 leap year bug)
                        const excelEpoch = new Date(1899, 11, 30);
                        dateOfEntry = new Date(excelEpoch.getTime() + rawDate * 86400000);
                    } else {
                        const parsed = new Date(String(rawDate));
                        if (!isNaN(parsed.getTime())) dateOfEntry = parsed;
                    }
                }

                // Get advisor assignment from detected advisor column
                const advisorValue = advisorIdx >= 0 && row[advisorIdx] ? String(row[advisorIdx]).trim() : null;
                let assignedAdvisorUserId: string | null = null;

                if (advisorValue) {
                    const advisorLower = advisorValue.toLowerCase();

                    // 1. Exact match on displayName or email
                    let matchedAdvisor = advisors.find((a: typeof advisors[number]) =>
                        a.displayName.toLowerCase() === advisorLower ||
                        a.email.toLowerCase() === advisorLower
                    );

                    // 2. Partial match: first name or last name
                    if (!matchedAdvisor) {
                        const partialMatches = advisors.filter((a: typeof advisors[number]) => {
                            const parts = a.displayName.toLowerCase().split(/\s+/);
                            return parts.some(part => part === advisorLower);
                        });
                        // Only use partial match if exactly one advisor matches (avoids ambiguity)
                        if (partialMatches.length === 1) {
                            matchedAdvisor = partialMatches[0];
                        }
                    }

                    // 3. Contains match (e.g., "S. Johnson" matching "Sarah Johnson")
                    if (!matchedAdvisor) {
                        const containsMatches = advisors.filter((a: typeof advisors[number]) =>
                            a.displayName.toLowerCase().includes(advisorLower) ||
                            advisorLower.includes(a.displayName.toLowerCase())
                        );
                        if (containsMatches.length === 1) {
                            matchedAdvisor = containsMatches[0];
                        }
                    }

                    assignedAdvisorUserId = matchedAdvisor?.id || null;

                    // Log warning if advisor value present but couldn't be matched
                    if (!assignedAdvisorUserId) {
                        errors.push({
                            rowIndex,
                            errorType: 'advisor_not_matched',
                            message: `Advisor "${advisorValue}" could not be matched to any active advisor in the system`,
                            values: dataRows[i],
                        });
                    }
                }

                // Generate import hash for idempotency
                const rawImportHash = generateImportHash(rawPayload);

                // Dedup logic per blueprint.md:
                // 1. normalized email_primary if present
                // 2. normalized phone_primary if present
                // 3. else external_row_id
                let existingLead = null;

                if (emailPrimary) {
                    existingLead = await prisma.lead.findFirst({
                        where: { emailPrimary },
                    });
                }

                if (!existingLead && phonePrimary) {
                    existingLead = await prisma.lead.findFirst({
                        where: { phonePrimary },
                    });
                }

                if (existingLead) {
                    // Update existing lead
                    const updateData: any = {
                        rawImportPayload: rawPayload,
                        rawImportHash,
                    };

                    // Only update mapped fields if new values are non-empty
                    if (firstName) updateData.firstName = firstName;
                    if (lastName) updateData.lastName = lastName;
                    if (fullName) updateData.fullName = fullName;
                    if (phonePrimary) updateData.phonePrimary = phonePrimary;
                    if (emailPrimary) updateData.emailPrimary = emailPrimary;

                    // Only update advisor if spreadsheet provides a value
                    if (assignedAdvisorUserId) {
                        updateData.assignedAdvisorUserId = assignedAdvisorUserId;
                    }
                    // Update new fields if present
                    if (loanProduct) updateData.loanProduct = loanProduct;
                    if (leadSource) updateData.leadSource = leadSource;
                    if (dateOfEntry) updateData.dateOfEntry = dateOfEntry;

                    await prisma.lead.update({
                        where: { id: existingLead.id },
                        data: updateData,
                    });

                    // Import notes as Interaction record if present
                    if (notesRaw) {
                        // Find admin user to attribute imported notes to
                        const adminUser = await prisma.user.findFirst({ where: { role: 'admin' } });
                        if (adminUser) {
                            // Check if this exact note was already imported to avoid duplicates
                            const existingNote = await prisma.interaction.findFirst({
                                where: {
                                    leadId: existingLead.id,
                                    type: 'note',
                                    summary: 'Imported Note',
                                    body: notesRaw,
                                },
                            });
                            if (!existingNote) {
                                await prisma.interaction.create({
                                    data: {
                                        leadId: existingLead.id,
                                        userId: adminUser.id,
                                        type: 'note',
                                        direction: 'internal',
                                        summary: 'Imported Note',
                                        body: notesRaw,
                                        occurredAt: dateOfEntry || existingLead.createdAt,
                                    },
                                });
                            }
                        }
                    }

                    rowsUpdated++;
                } else {
                    // Create new lead
                    const newLead = await prisma.lead.create({
                        data: {
                            externalSource: DEFAULT_IMPORT_SOURCE,
                            externalRowId: `row_${rowIndex}`,
                            firstName,
                            lastName,
                            fullName,
                            phonePrimary,
                            emailPrimary,
                            assignedAdvisorUserId,
                            loanProduct,
                            leadSource,
                            dateOfEntry,
                            status: 'NEW',
                            rawImportPayload: rawPayload,
                            rawImportHash,
                        },
                    });

                    // Import notes as Interaction record if present
                    if (notesRaw) {
                        const adminUser = await prisma.user.findFirst({ where: { role: 'admin' } });
                        if (adminUser) {
                            await prisma.interaction.create({
                                data: {
                                    leadId: newLead.id,
                                    userId: adminUser.id,
                                    type: 'note',
                                    direction: 'internal',
                                    summary: 'Imported Note',
                                    body: notesRaw,
                                    occurredAt: dateOfEntry || new Date(),
                                },
                            });
                        }
                    }

                    rowsInserted++;
                }
            } catch (error: any) {
                errors.push({
                    rowIndex,
                    errorType: 'processing_error',
                    message: error.message,
                    values: dataRows[i],
                });
                rowsFailed++;
            }
        }

        // Update import record
        await prisma.import.update({
            where: { id: importRecord.id },
            data: {
                completedAt: new Date(),
                rowsProcessed: dataRows.length,
                rowsInserted,
                rowsUpdated,
                rowsFailed,
                errorLog: errors.length > 0 ? errors : undefined,
            },
        });

        return NextResponse.json({
            success: true,
            importId: importRecord.id,
            stats: {
                rowsProcessed: dataRows.length,
                rowsInserted,
                rowsUpdated,
                rowsFailed,
            },
            errors: errors.slice(0, 10), // Only return first 10 errors
        });
    } catch (error) {
        console.error('Error importing leads:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// GET /api/import - Get import history
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const imports = await prisma.import.findMany({
            orderBy: { startedAt: 'desc' },
            take: 20,
        });

        return NextResponse.json({ data: imports });
    } catch (error) {
        console.error('Error fetching imports:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
