import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import prisma from '@/lib/db';

// POST /api/leads/[id]/archive - Archive or unarchive a lead (admin only)
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const body = await request.json();
        const { archived } = body;

        const lead = await prisma.lead.findUnique({ where: { id } });
        if (!lead) {
            return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
        }

        const updatedLead = await prisma.lead.update({
            where: { id },
            data: {
                archived: archived !== false, // default to true
                archivedAt: archived !== false ? new Date() : null,
            },
        });

        // Create audit log
        await prisma.auditLog.create({
            data: {
                actorUserId: session.user.id,
                entityType: 'lead',
                entityId: id,
                action: archived !== false ? 'archive' : 'unarchive',
                before: lead as any,
                after: updatedLead as any,
            },
        });

        return NextResponse.json({
            data: updatedLead,
            message: archived !== false ? 'Lead archived' : 'Lead unarchived',
        });
    } catch (error) {
        console.error('Error archiving lead:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
