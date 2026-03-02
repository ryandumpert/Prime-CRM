import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import prisma from '@/lib/db';

// POST /api/leads/batch-archive - Archive multiple leads at once (admin only)
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { leadIds, archived = true } = body;

        if (!Array.isArray(leadIds) || leadIds.length === 0) {
            return NextResponse.json({ error: 'leadIds must be a non-empty array' }, { status: 400 });
        }

        // Cap at 100 leads per batch to prevent abuse
        if (leadIds.length > 100) {
            return NextResponse.json({ error: 'Cannot archive more than 100 leads at once' }, { status: 400 });
        }

        // Batch update all leads
        const result = await prisma.lead.updateMany({
            where: {
                id: { in: leadIds },
            },
            data: {
                archived: archived !== false,
                archivedAt: archived !== false ? new Date() : null,
            },
        });

        // Create audit logs for each
        await prisma.auditLog.createMany({
            data: leadIds.map((id: string) => ({
                actorUserId: session.user.id,
                entityType: 'lead',
                entityId: id,
                action: archived !== false ? 'archive' : 'unarchive',
            })),
        });

        return NextResponse.json({
            success: true,
            count: result.count,
            message: `${result.count} lead(s) ${archived !== false ? 'archived' : 'unarchived'}`,
        });
    } catch (error) {
        console.error('Error batch archiving leads:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
