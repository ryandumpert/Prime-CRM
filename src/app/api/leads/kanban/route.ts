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

            // Fetch latest note for each lead (for card preview)
            const leadsWithNotes = await Promise.all(
                leads.map(async (lead) => {
                    const latestNote = await prisma.interaction.findFirst({
                        where: { leadId: lead.id, type: 'note' },
                        select: { summary: true, body: true, occurredAt: true },
                        orderBy: { occurredAt: 'desc' },
                    });
                    return {
                        ...lead,
                        latestNote: latestNote
                            ? (latestNote.body || latestNote.summary || '').slice(0, 80)
                            : null,
                    };
                })
            );

            const count = await prisma.lead.count({
                where: {
                    ...baseWhere,
                    status,
                },
            });

            return {
                status,
                leads: leadsWithNotes,
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
