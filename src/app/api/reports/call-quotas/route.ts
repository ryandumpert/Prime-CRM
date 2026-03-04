import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import prisma from '@/lib/db';

// GET /api/reports/call-quotas - Get daily call quota progress for all advisors
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const isAdmin = session.user.role === 'admin';

        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of current week (Sunday)
        weekStart.setHours(0, 0, 0, 0);

        // If advisor, only show their own data
        const advisorFilter = isAdmin
            ? { role: 'advisor' as const, active: true }
            : { id: session.user.id, active: true };

        const advisors = await prisma.user.findMany({
            where: advisorFilter,
            select: {
                id: true,
                displayName: true,
                minimumDailyCalls: true,
            },
            orderBy: { displayName: 'asc' },
        });

        const quotaData = await Promise.all(
            advisors.map(async (advisor) => {
                // Count calls made today
                const callsToday = await prisma.interaction.count({
                    where: {
                        userId: advisor.id,
                        type: 'call',
                        occurredAt: { gte: todayStart },
                    },
                });

                // Count calls made this week
                const callsThisWeek = await prisma.interaction.count({
                    where: {
                        userId: advisor.id,
                        type: 'call',
                        occurredAt: { gte: weekStart },
                    },
                });

                // Calculate days in the week so far (including today)
                const today = new Date();
                const dayOfWeek = today.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
                const workDays = Math.min(dayOfWeek === 0 ? 1 : dayOfWeek, 5); // Cap at 5 work days
                const weeklyTarget = advisor.minimumDailyCalls * workDays;

                const dailyProgress = advisor.minimumDailyCalls > 0
                    ? Math.round((callsToday / advisor.minimumDailyCalls) * 100)
                    : 100;

                const weeklyProgress = weeklyTarget > 0
                    ? Math.round((callsThisWeek / weeklyTarget) * 100)
                    : 100;

                return {
                    advisorId: advisor.id,
                    advisorName: advisor.displayName,
                    minimumDailyCalls: advisor.minimumDailyCalls,
                    callsToday,
                    callsThisWeek,
                    weeklyTarget,
                    dailyProgress: Math.min(dailyProgress, 100),
                    weeklyProgress: Math.min(weeklyProgress, 100),
                    quotaMet: callsToday >= advisor.minimumDailyCalls,
                };
            })
        );

        return NextResponse.json({ data: quotaData });
    } catch (error) {
        console.error('Error fetching call quotas:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
