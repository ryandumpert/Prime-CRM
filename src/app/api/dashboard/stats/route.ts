import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import prisma from '@/lib/db';
import { TERMINAL_STATUSES, CALL_LIST_DAYS_THRESHOLD, LEAD_STATUSES, PIPELINES, PipelineType } from '@/lib/constants';

// GET /api/dashboard/stats - Get dashboard statistics
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const isAdmin = session.user.role === 'admin';
        const userId = session.user.id;

        // Base where clause for role-based access
        const baseWhere = isAdmin ? { archived: false } : { assignedAdvisorUserId: userId, archived: false };

        // Get total leads
        const totalLeads = await prisma.lead.count({ where: baseWhere });

        // Get new leads
        const newLeads = await prisma.lead.count({
            where: { ...baseWhere, status: 'NEW' },
        });

        // Get active leads (non-terminal)
        const activeLeads = await prisma.lead.count({
            where: {
                ...baseWhere,
                status: { notIn: TERMINAL_STATUSES },
            },
        });

        // Get closed/funded leads
        const closedLeads = await prisma.lead.count({
            where: { ...baseWhere, status: 'CLOSED_FUNDED' },
        });

        // Get daily call list count
        const fiveDaysAgo = new Date();
        fiveDaysAgo.setDate(fiveDaysAgo.getDate() - CALL_LIST_DAYS_THRESHOLD);

        const callListCount = await prisma.lead.count({
            where: {
                ...baseWhere,
                status: { notIn: TERMINAL_STATUSES },
                OR: [
                    { lastContactedAt: null },
                    { lastContactedAt: { lt: fiveDaysAgo } },
                ],
            },
        });

        // Get contacted today
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const contactedToday = await prisma.lead.count({
            where: {
                ...baseWhere,
                lastContactedAt: { gte: todayStart },
            },
        });

        // Get status counts
        const statusCounts: Record<string, number> = {};
        for (const status of LEAD_STATUSES) {
            statusCounts[status] = await prisma.lead.count({
                where: { ...baseWhere, status },
            });
        }

        // If admin, get per-advisor stats
        let advisorStats = null;
        if (isAdmin) {
            const advisors = await prisma.user.findMany({
                where: { role: 'advisor', active: true },
                select: { id: true, displayName: true },
            });

            advisorStats = await Promise.all(
                advisors.map(async (advisor: { id: string; displayName: string }) => {
                    const advisorWhere = { assignedAdvisorUserId: advisor.id, archived: false };

                    const totalLeads = await prisma.lead.count({ where: advisorWhere });

                    const callListCount = await prisma.lead.count({
                        where: {
                            ...advisorWhere,
                            status: { notIn: TERMINAL_STATUSES },
                            OR: [
                                { lastContactedAt: null },
                                { lastContactedAt: { lt: fiveDaysAgo } },
                            ],
                        },
                    });

                    const contactedToday = await prisma.lead.count({
                        where: {
                            ...advisorWhere,
                            lastContactedAt: { gte: todayStart },
                        },
                    });

                    const weekStart = new Date();
                    weekStart.setDate(weekStart.getDate() - 7);

                    const contactedThisWeek = await prisma.lead.count({
                        where: {
                            ...advisorWhere,
                            lastContactedAt: { gte: weekStart },
                        },
                    });

                    return {
                        advisorId: advisor.id,
                        advisorName: advisor.displayName,
                        totalLeads,
                        callListCount,
                        contactedToday,
                        contactedThisWeek,
                    };
                })
            );
        }

        // Get pipeline counts
        const pipelineCounts: Record<string, number> = {};
        for (const pipeline of PIPELINES) {
            pipelineCounts[pipeline] = await prisma.lead.count({
                where: { ...baseWhere, pipeline },
            });
        }

        return NextResponse.json({
            data: {
                totalLeads,
                newLeads,
                activeLeads,
                closedLeads,
                callListCount,
                contactedToday,
                statusCounts,
                advisorStats,
                pipelineCounts,
            },
        });
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
