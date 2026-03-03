import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import prisma from '@/lib/db';
import * as XLSX from 'xlsx';
import { normalizePhone, normalizeEmail } from '@/lib/utils';
import { HEADER_PATTERNS } from '@/lib/constants';

// Helper to match header patterns (case/whitespace-insensitive)
function matchHeader(header: string, patterns: string[]): boolean {
    const normalized = header.toLowerCase().trim().replace(/[_\-\s]+/g, ' ');
    return patterns.some(p => normalized === p || normalized.includes(p));
}

// POST /api/import/preview - Preview import without committing
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

        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });

        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        const rawData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, {
            header: 1,
            defval: '',
        });

        if (rawData.length < 2) {
            return NextResponse.json({ error: 'No data rows found in spreadsheet' }, { status: 400 });
        }

        const headers = rawData[0] as string[];
        const dataRows = rawData.slice(1);

        // Get advisors for matching
        const advisors = await prisma.user.findMany({
            where: { role: 'advisor', active: true },
            select: { id: true, displayName: true, email: true },
        });

        // Map column indices
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

        // Detected columns for display
        const detectedColumns: Record<string, string> = {};
        if (firstNameIdx >= 0) detectedColumns['First Name'] = String(headers[firstNameIdx]);
        if (lastNameIdx >= 0) detectedColumns['Last Name'] = String(headers[lastNameIdx]);
        if (fullNameIdx >= 0) detectedColumns['Full Name'] = String(headers[fullNameIdx]);
        if (phoneIdx >= 0) detectedColumns['Phone'] = String(headers[phoneIdx]);
        if (emailIdx >= 0) detectedColumns['Email'] = String(headers[emailIdx]);
        if (dateIdx >= 0) detectedColumns['Date of Entry'] = String(headers[dateIdx]);
        if (advisorIdx >= 0) detectedColumns['Advisor'] = String(headers[advisorIdx]);
        if (loanProductIdx >= 0) detectedColumns['Loan Product'] = String(headers[loanProductIdx]);
        if (sourceIdx >= 0) detectedColumns['Lead Source'] = String(headers[sourceIdx]);
        if (notesIdx >= 0) detectedColumns['Notes'] = String(headers[notesIdx]);

        // Preview each row
        const previewRows: Array<{
            rowIndex: number;
            action: 'new' | 'update' | 'skip';
            name: string;
            phone: string | null;
            email: string | null;
            loanProduct: string | null;
            leadSource: string | null;
            advisor: string | null;
            matchedOn: string | null;
            existingLeadId: string | null;
        }> = [];

        let newCount = 0;
        let updateCount = 0;
        let skipCount = 0;

        // Limit preview to first 200 rows for performance, but count all
        const previewLimit = 200;

        for (let i = 0; i < dataRows.length; i++) {
            const row = dataRows[i] as any[];
            const rowIndex = i + 2;

            try {
                // Build raw payload to check for empty rows
                const rawPayload: Record<string, any> = {};
                headers.forEach((header, idx) => {
                    if (header && row[idx] !== undefined) {
                        rawPayload[String(header)] = row[idx];
                    }
                });

                // Skip empty rows
                const hasData = Object.values(rawPayload).some(v => v !== '' && v !== null && v !== undefined);
                if (!hasData) {
                    skipCount++;
                    continue;
                }

                // Extract fields
                const firstName = firstNameIdx >= 0 ? String(row[firstNameIdx] || '') : '';
                const lastName = lastNameIdx >= 0 ? String(row[lastNameIdx] || '') : '';
                let fullName = fullNameIdx >= 0 ? String(row[fullNameIdx] || '') : '';
                if (!fullName && (firstName || lastName)) {
                    fullName = `${firstName} ${lastName}`.trim();
                }

                const phonePrimary = phoneIdx >= 0 ? normalizePhone(String(row[phoneIdx] || '')) : null;
                const emailPrimary = emailIdx >= 0 ? normalizeEmail(String(row[emailIdx] || '')) : null;
                const loanProduct = loanProductIdx >= 0 && row[loanProductIdx] ? String(row[loanProductIdx]).trim() : null;
                const leadSource = sourceIdx >= 0 && row[sourceIdx] ? String(row[sourceIdx]).trim() : null;

                // Advisor matching
                const advisorValue = advisorIdx >= 0 && row[advisorIdx] ? String(row[advisorIdx]).trim() : null;
                let advisorName: string | null = null;
                if (advisorValue) {
                    const advisorLower = advisorValue.toLowerCase();
                    let matchedAdvisor = advisors.find(a =>
                        a.displayName.toLowerCase() === advisorLower ||
                        a.email.toLowerCase() === advisorLower
                    );
                    if (!matchedAdvisor) {
                        const partialMatches = advisors.filter(a => {
                            const parts = a.displayName.toLowerCase().split(/\s+/);
                            return parts.some(part => part === advisorLower);
                        });
                        if (partialMatches.length === 1) matchedAdvisor = partialMatches[0];
                    }
                    advisorName = matchedAdvisor?.displayName || `${advisorValue} (unmatched)`;
                }

                // Duplicate detection — same logic as import
                let existingLead = null;
                let matchedOn: string | null = null;

                if (emailPrimary) {
                    existingLead = await prisma.lead.findFirst({
                        where: { emailPrimary },
                        select: { id: true, firstName: true, lastName: true, fullName: true },
                    });
                    if (existingLead) matchedOn = 'email';
                }

                if (!existingLead && phonePrimary) {
                    existingLead = await prisma.lead.findFirst({
                        where: { phonePrimary },
                        select: { id: true, firstName: true, lastName: true, fullName: true },
                    });
                    if (existingLead) matchedOn = 'phone';
                }

                const action = existingLead ? 'update' : 'new';
                if (action === 'new') newCount++;
                else updateCount++;

                // Only push details for the first N rows
                if (previewRows.length < previewLimit) {
                    previewRows.push({
                        rowIndex,
                        action,
                        name: fullName || firstName || lastName || 'Unknown',
                        phone: phonePrimary,
                        email: emailPrimary,
                        loanProduct,
                        leadSource,
                        advisor: advisorName,
                        matchedOn,
                        existingLeadId: existingLead?.id || null,
                    });
                }
            } catch {
                skipCount++;
            }
        }

        return NextResponse.json({
            success: true,
            totalRows: dataRows.length,
            stats: {
                newLeads: newCount,
                updates: updateCount,
                skipped: skipCount,
            },
            detectedColumns,
            previewRows,
            hasMore: dataRows.length - skipCount > previewLimit,
        });
    } catch (error) {
        console.error('Error previewing import:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
