import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import prisma from '@/lib/db';

// GET /api/reports/lead-sources - Get lead source analytics (admin only)
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get all leads grouped by source
        const allLeads = await prisma.lead.findMany({
            where: { archived: false },
            select: {
                id: true,
                leadSource: true,
                status: true,
                pipeline: true,
                lastContactedAt: true,
                createdAt: true,
                statusUpdatedAt: true,
            },
        });

        // Group by lead source
        const sourceMap: Record<string, {
            source: string;
            total: number;
            contacted: number;
            warm: number;
            processing: number;
            funded: number;
            lost: number;
            notInterested: number;
            unqualified: number;
            new: number;
            totalDaysToConvert: number;
            convertedCount: number;
        }> = {};

        for (const lead of allLeads) {
            const source = lead.leadSource || 'Unknown';

            if (!sourceMap[source]) {
                sourceMap[source] = {
                    source,
                    total: 0,
                    contacted: 0,
                    warm: 0,
                    processing: 0,
                    funded: 0,
                    lost: 0,
                    notInterested: 0,
                    unqualified: 0,
                    new: 0,
                    totalDaysToConvert: 0,
                    convertedCount: 0,
                };
            }

            const s = sourceMap[source];
            s.total++;

            if (lead.lastContactedAt) {
                s.contacted++;
            }

            if (lead.status === 'NEW') {
                s.new++;
            }

            if (lead.pipeline === 'warm_leads') {
                s.warm++;
            }

            if (lead.pipeline === 'processing') {
                s.processing++;
            }

            if (lead.status === 'CLOSED_FUNDED') {
                s.funded++;
                // Calculate time to convert
                if (lead.statusUpdatedAt && lead.createdAt) {
                    const days = Math.round(
                        (new Date(lead.statusUpdatedAt).getTime() - new Date(lead.createdAt).getTime())
                        / (1000 * 60 * 60 * 24)
                    );
                    s.totalDaysToConvert += days;
                    s.convertedCount++;
                }
            }

            if (lead.status === 'LOST') s.lost++;
            if (lead.status === 'NOT_INTERESTED') s.notInterested++;
            if (lead.status === 'UNQUALIFIED') s.unqualified++;
        }

        // Convert to array with computed percentages
        const sources = Object.values(sourceMap).map(s => ({
            source: s.source,
            total: s.total,
            contacted: s.contacted,
            contactedPct: s.total > 0 ? Math.round((s.contacted / s.total) * 1000) / 10 : 0,
            warm: s.warm,
            warmPct: s.total > 0 ? Math.round((s.warm / s.total) * 1000) / 10 : 0,
            processing: s.processing,
            processingPct: s.total > 0 ? Math.round((s.processing / s.total) * 1000) / 10 : 0,
            funded: s.funded,
            fundedPct: s.total > 0 ? Math.round((s.funded / s.total) * 1000) / 10 : 0,
            lost: s.lost,
            notInterested: s.notInterested,
            unqualified: s.unqualified,
            newLeads: s.new,
            avgDaysToConvert: s.convertedCount > 0 ? Math.round(s.totalDaysToConvert / s.convertedCount) : null,
            // Quality score: weighted composite
            qualityScore: s.total > 0
                ? Math.round(
                    (((s.funded * 100) + (s.warm * 30) + (s.processing * 50) - (s.lost * 10) - (s.notInterested * 5) - (s.unqualified * 15))
                        / s.total) * 10
                ) / 10
                : 0,
        }));

        // Sort by total leads descending
        sources.sort((a, b) => b.total - a.total);

        // Compute summary
        const summary = {
            totalSources: sources.length,
            totalLeads: allLeads.length,
            overallContactedPct: allLeads.length > 0
                ? Math.round((allLeads.filter(l => l.lastContactedAt).length / allLeads.length) * 1000) / 10
                : 0,
            overallFundedPct: allLeads.length > 0
                ? Math.round((allLeads.filter(l => l.status === 'CLOSED_FUNDED').length / allLeads.length) * 1000) / 10
                : 0,
            bestSource: sources.length > 0
                ? sources.reduce((best, s) => s.qualityScore > best.qualityScore ? s : best, sources[0]).source
                : null,
        };

        return NextResponse.json({ data: { sources, summary } });
    } catch (error) {
        console.error('Error fetching lead source analytics:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
