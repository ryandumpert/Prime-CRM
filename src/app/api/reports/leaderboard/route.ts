import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import prisma from '@/lib/db';
import { TERMINAL_STATUSES } from '@/lib/constants';

// GET /api/reports/leaderboard - Get advisor performance leaderboard (admin only)
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - 7);

        const monthStart = new Date();
        monthStart.setDate(monthStart.getDate() - 30);

        // Get all active advisors
        const advisors = await prisma.user.findMany({
            where: { role: 'advisor', active: true },
            select: { id: true, displayName: true },
        });

        const leaderboard = await Promise.all(
            advisors.map(async (advisor) => {
                const advisorWhere = { assignedAdvisorUserId: advisor.id, archived: false };

                // Total leads
                const totalLeads = await prisma.lead.count({ where: advisorWhere });

                // Calls made today (interactions of type 'call')
                const callsToday = await prisma.interaction.count({
                    where: {
                        userId: advisor.id,
                        type: 'call',
                        occurredAt: { gte: todayStart },
                    },
                });

                // Calls this week
                const callsThisWeek = await prisma.interaction.count({
                    where: {
                        userId: advisor.id,
                        type: 'call',
                        occurredAt: { gte: weekStart },
                    },
                });

                // Total interactions this week (all types except status/assignment changes)
                const interactionsThisWeek = await prisma.interaction.count({
                    where: {
                        userId: advisor.id,
                        type: { in: ['call', 'text', 'email'] },
                        occurredAt: { gte: weekStart },
                    },
                });

                // Leads contacted today
                const leadsContactedToday = await prisma.lead.count({
                    where: {
                        ...advisorWhere,
                        lastContactedAt: { gte: todayStart },
                    },
                });

                // Leads contacted this week
                const leadsContactedThisWeek = await prisma.lead.count({
                    where: {
                        ...advisorWhere,
                        lastContactedAt: { gte: weekStart },
                    },
                });

                // Leads moved to warm (status is in warm pipeline)
                const leadsWarm = await prisma.lead.count({
                    where: {
                        ...advisorWhere,
                        pipeline: 'warm_leads',
                    },
                });

                // Leads in processing
                const leadsProcessing = await prisma.lead.count({
                    where: {
                        ...advisorWhere,
                        pipeline: 'processing',
                    },
                });

                // Leads closed/funded
                const leadsFunded = await prisma.lead.count({
                    where: {
                        ...advisorWhere,
                        status: 'CLOSED_FUNDED',
                    },
                });

                // Average response time: time between lead creation and first interaction
                const leadsWithFirstInteraction = await prisma.lead.findMany({
                    where: {
                        ...advisorWhere,
                        interactions: { some: {} },
                    },
                    select: {
                        createdAt: true,
                        interactions: {
                            orderBy: { occurredAt: 'asc' },
                            take: 1,
                            select: { occurredAt: true },
                        },
                    },
                    take: 100, // Sample last 100 leads
                    orderBy: { createdAt: 'desc' },
                });

                let avgResponseHours = null;
                if (leadsWithFirstInteraction.length > 0) {
                    const totalHours = leadsWithFirstInteraction.reduce((sum, lead) => {
                        if (lead.interactions.length > 0) {
                            const diffMs = new Date(lead.interactions[0].occurredAt).getTime() - new Date(lead.createdAt).getTime();
                            return sum + (diffMs / (1000 * 60 * 60));
                        }
                        return sum;
                    }, 0);
                    avgResponseHours = Math.round((totalHours / leadsWithFirstInteraction.length) * 10) / 10;
                }

                // Conversion rate: funded / total non-terminal non-new
                const conversionRate = totalLeads > 0
                    ? Math.round((leadsFunded / totalLeads) * 1000) / 10
                    : 0;

                // Follow-up compliance: leads not overdue / total active leads
                const activeLeads = await prisma.lead.count({
                    where: {
                        ...advisorWhere,
                        status: { notIn: TERMINAL_STATUSES },
                    },
                });

                const fiveDaysAgo = new Date();
                fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

                const overdueLeads = await prisma.lead.count({
                    where: {
                        ...advisorWhere,
                        status: { notIn: TERMINAL_STATUSES },
                        OR: [
                            { lastContactedAt: null },
                            { lastContactedAt: { lt: fiveDaysAgo } },
                        ],
                    },
                });

                const followUpRate = activeLeads > 0
                    ? Math.round(((activeLeads - overdueLeads) / activeLeads) * 1000) / 10
                    : 100;

                return {
                    advisorId: advisor.id,
                    advisorName: advisor.displayName,
                    totalLeads,
                    activeLeads,
                    callsToday,
                    callsThisWeek,
                    interactionsThisWeek,
                    leadsContactedToday,
                    leadsContactedThisWeek,
                    leadsWarm,
                    leadsProcessing,
                    leadsFunded,
                    avgResponseHours,
                    conversionRate,
                    followUpRate,
                    overdueLeads,
                };
            })
        );

        // Sort by a composite score: callsThisWeek + conversions
        leaderboard.sort((a, b) => {
            const scoreA = a.callsThisWeek * 1 + a.leadsFunded * 10 + a.leadsWarm * 3;
            const scoreB = b.callsThisWeek * 1 + b.leadsFunded * 10 + b.leadsWarm * 3;
            return scoreB - scoreA;
        });

        return NextResponse.json({ data: leaderboard });
    } catch (error) {
        console.error('Error fetching leaderboard:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
