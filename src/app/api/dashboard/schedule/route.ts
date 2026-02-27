import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import prisma from '@/lib/db';
import { TERMINAL_STATUSES } from '@/lib/constants';

// GET /api/dashboard/schedule - Get leads with nextActionAt in the next 5 days
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const isAdmin = session.user.role === 'admin';
        const userId = session.user.id;

        // Calculate date range: start of today through end of day 4 from now (5 days total)
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const endDate = new Date(today);
        endDate.setDate(endDate.getDate() + 5);

        // Base where clause
        const baseWhere: any = {
            archived: false,
            status: { notIn: TERMINAL_STATUSES },
            nextActionAt: {
                gte: today,
                lt: endDate,
            },
        };

        // Role-based access: advisors only see their own leads
        if (!isAdmin) {
            baseWhere.assignedAdvisorUserId = userId;
        }

        const leads = await prisma.lead.findMany({
            where: baseWhere,
            select: {
                id: true,
                firstName: true,
                lastName: true,
                fullName: true,
                phonePrimary: true,
                status: true,
                priority: true,
                nextActionAt: true,
                lastContactedAt: true,
                pipeline: true,
                assignedAdvisor: {
                    select: { id: true, displayName: true },
                },
            },
            orderBy: [
                { nextActionAt: 'asc' },
                { priority: 'desc' },
            ],
        });

        return NextResponse.json({ data: leads });
    } catch (error) {
        console.error('Error fetching schedule:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
