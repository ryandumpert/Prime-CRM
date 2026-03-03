import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import prisma from '@/lib/db';
import { PipelineType, PIPELINES, PIPELINE_STATUSES, LeadStatusType } from '@/lib/constants';

// GET /api/leads/kanban?pipeline=cold_leads&limit=100
// Returns leads grouped by status columns for the Kanban board
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const searchParams = request.nextUrl.searchParams;
        const pipeline = searchParams.get('pipeline') as PipelineType;
        const limit = parseInt(searchParams.get('limit') || '100', 10);

        if (!pipeline || !PIPELINES.includes(pipeline)) {
            return NextResponse.json({ error: 'Invalid or missing pipeline parameter' }, { status: 400 });
        }

        const isAdmin = session.user.role === 'admin';
        const userId = session.user.id;

        // Base where clause for role-based access
        const baseWhere: any = {
            archived: false,
            pipeline: pipeline,
        };
        if (!isAdmin) {
            baseWhere.assignedAdvisorUserId = userId;
        }

        const statuses = PIPELINE_STATUSES[pipeline];

        // Fetch leads for each status column in parallel
        const columnPromises = statuses.map(async (status: LeadStatusType) => {
            const leads = await prisma.lead.findMany({
                where: {
                    ...baseWhere,
                    status,
                },
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    fullName: true,
                    phonePrimary: true,
                    emailPrimary: true,
                    status: true,
                    priority: true,
                    lastContactedAt: true,
                    statusUpdatedAt: true,
                    nextActionAt: true,
                    pipeline: true,
                    dateOfEntry: true,
                    leadSource: true,
                    loanProduct: true,
                    assignedAdvisor: {
                        select: {
                            id: true,
                            displayName: true,
                        },
                    },
                },
                orderBy: [
                    { priority: 'desc' },
                    { lastContactedAt: 'asc' },
                ],
                take: limit,
            });

            // Fetch latest note and interaction count for each lead
            const leadsWithExtras = await Promise.all(
                leads.map(async (lead) => {
                    const [latestNote, interactionCount] = await Promise.all([
                        prisma.interaction.findFirst({
                            where: { leadId: lead.id, type: 'note' },
                            select: { summary: true, body: true, occurredAt: true },
                            orderBy: { occurredAt: 'desc' },
                        }),
                        prisma.interaction.count({
                            where: { leadId: lead.id, type: { in: ['call', 'text', 'email'] } },
                        }),
                    ]);

                    // Compute lead score (0-100)
                    let score = 0;
                    const now = Date.now();

                    // 1. Recency of last contact (0-40 pts) — contacted today = 40, >30 days = 0
                    if (lead.lastContactedAt) {
                        const daysSince = Math.floor((now - new Date(lead.lastContactedAt).getTime()) / 86400000);
                        score += Math.max(0, 40 - Math.floor(daysSince * 1.5));
                    }

                    // 2. Interaction count (0-25 pts) — more engagement = higher score
                    score += Math.min(25, interactionCount * 5);

                    // 3. Priority level (0-15 pts)
                    if (lead.priority === 'high') score += 15;
                    else if (lead.priority === 'normal') score += 8;
                    else score += 3;

                    // 4. Freshness of entry (0-10 pts) — newer leads get slight boost
                    if (lead.dateOfEntry) {
                        const entryDays = Math.floor((now - new Date(lead.dateOfEntry).getTime()) / 86400000);
                        score += Math.max(0, 10 - Math.floor(entryDays / 7));
                    } else {
                        score += 5; // neutral if unknown
                    }

                    // 5. Contact completeness (0-10 pts) — has phone + email = fully reachable
                    if (lead.phonePrimary) score += 5;
                    if (lead.emailPrimary) score += 5;

                    return {
                        ...lead,
                        latestNote: latestNote
                            ? (latestNote.body || latestNote.summary || '').slice(0, 80)
                            : null,
                        interactionCount,
                        leadScore: Math.min(100, Math.max(0, score)),
                    };
                })
            );

            // Sort by lead score descending within each column
            leadsWithExtras.sort((a, b) => b.leadScore - a.leadScore);

            const count = await prisma.lead.count({
                where: {
                    ...baseWhere,
                    status,
                },
            });

            return {
                status,
                leads: leadsWithExtras,
                count,
                hasMore: count > limit,
            };
        });

        const columns = await Promise.all(columnPromises);

        // Build response as a map
        const columnsMap: Record<string, { leads: any[]; count: number; hasMore: boolean }> = {};
        for (const col of columns) {
            columnsMap[col.status] = {
                leads: col.leads,
                count: col.count,
                hasMore: col.hasMore,
            };
        }

        return NextResponse.json({
            pipeline,
            columns: columnsMap,
        });
    } catch (error) {
        console.error('Error fetching kanban data:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
