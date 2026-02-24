import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import prisma from '@/lib/db';
import { HEADER_PATTERNS } from '@/lib/constants';

// Helper to check if a key looks like an advisor column
function isAdvisorKey(key: string): boolean {
    const normalized = key.toLowerCase().trim().replace(/[_\-\s]+/g, ' ');
    return HEADER_PATTERNS.advisor.some(p => normalized === p || normalized.includes(p));
}

// POST /api/import/backfill-advisors - Retroactively assign advisors from rawImportPayload
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized - Admin only' }, { status: 401 });
        }

        // Get all active advisors
        const advisors = await prisma.user.findMany({
            where: { role: 'advisor', active: true },
        });

        if (advisors.length === 0) {
            return NextResponse.json({ error: 'No active advisors found in the system' }, { status: 400 });
        }

        // Find leads that have rawImportPayload but no assignedAdvisorUserId
        const unassignedLeads = await prisma.lead.findMany({
            where: {
                assignedAdvisorUserId: null,
                rawImportPayload: { not: null as any },
            },
            select: {
                id: true,
                rawImportPayload: true,
                fullName: true,
            },
        });

        let matched = 0;
        let unmatched = 0;
        const unmatchedValues: { leadId: string; leadName: string | null; advisorValue: string }[] = [];
        const matchedDetails: { leadId: string; leadName: string | null; advisorValue: string; matchedAdvisor: string }[] = [];

        for (const lead of unassignedLeads) {
            const payload = lead.rawImportPayload as Record<string, any> | null;
            if (!payload) continue;

            // Find advisor value from any key that matches advisor header patterns
            let advisorValue: string | null = null;
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

            if (matchedAdvisor) {
                await prisma.lead.update({
                    where: { id: lead.id },
                    data: { assignedAdvisorUserId: matchedAdvisor.id },
                });
                matched++;
                matchedDetails.push({
                    leadId: lead.id,
                    leadName: lead.fullName,
                    advisorValue,
                    matchedAdvisor: matchedAdvisor.displayName,
                });
            } else {
                unmatched++;
                unmatchedValues.push({
                    leadId: lead.id,
                    leadName: lead.fullName,
                    advisorValue,
                });
            }
        }

        // Deduplicate unmatched advisor values for summary
        const uniqueUnmatchedValues = [...new Set(unmatchedValues.map(u => u.advisorValue))];

        return NextResponse.json({
            success: true,
            summary: {
                totalUnassignedLeads: unassignedLeads.length,
                matched,
                unmatched,
                uniqueUnmatchedAdvisorValues: uniqueUnmatchedValues,
            },
            matchedDetails: matchedDetails.slice(0, 50), // First 50 for review
            unmatchedDetails: unmatchedValues.slice(0, 50), // First 50 for review
            availableAdvisors: advisors.map(a => ({ id: a.id, displayName: a.displayName, email: a.email })),
        });
    } catch (error) {
        console.error('Error backfilling advisors:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
