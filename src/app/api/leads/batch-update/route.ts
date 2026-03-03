import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import prisma from '@/lib/db';
import { LEAD_STATUSES, LeadStatusType } from '@/lib/constants';

// POST /api/leads/batch-update - Bulk reassign, status change, priority change (admin only)
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { leadIds, action, value } = body;

        if (!Array.isArray(leadIds) || leadIds.length === 0) {
            return NextResponse.json({ error: 'leadIds must be a non-empty array' }, { status: 400 });
        }

        if (leadIds.length > 200) {
            return NextResponse.json({ error: 'Cannot update more than 200 leads at once' }, { status: 400 });
        }

        if (!action || !value) {
            return NextResponse.json({ error: 'action and value are required' }, { status: 400 });
        }

        let updateData: any = {};
        let actionLabel = '';

        switch (action) {
            case 'reassign':
                // Verify the target user exists
                const targetUser = await prisma.user.findUnique({
                    where: { id: value },
                    select: { id: true, displayName: true },
                });
                if (!targetUser) {
                    return NextResponse.json({ error: 'Target advisor not found' }, { status: 400 });
                }
                updateData.assignedAdvisorUserId = value;
                actionLabel = `Reassigned to ${targetUser.displayName}`;
                break;

            case 'status':
                if (!LEAD_STATUSES.includes(value as LeadStatusType)) {
                    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
                }
                updateData.status = value;
                updateData.statusUpdatedAt = new Date();
                actionLabel = `Status changed to ${value}`;
                break;

            case 'priority':
                if (!['low', 'normal', 'high'].includes(value)) {
                    return NextResponse.json({ error: 'Invalid priority' }, { status: 400 });
                }
                updateData.priority = value;
                actionLabel = `Priority changed to ${value}`;
                break;

            default:
                return NextResponse.json({ error: 'Invalid action. Use: reassign, status, or priority' }, { status: 400 });
        }

        // Execute batch update
        const result = await prisma.lead.updateMany({
            where: {
                id: { in: leadIds },
                archived: false,
            },
            data: updateData,
        });

        // Create audit logs
        await prisma.auditLog.createMany({
            data: leadIds.map((id: string) => ({
                actorUserId: session.user.id,
                entityType: 'lead',
                entityId: id,
                action: `batch_${action}`,
                after: { [action]: value },
            })),
        });

        // Create interaction records for status changes
        if (action === 'status') {
            await prisma.interaction.createMany({
                data: leadIds.map((id: string) => ({
                    leadId: id,
                    userId: session.user.id,
                    type: 'status_change' as const,
                    direction: 'internal' as const,
                    summary: `Batch status change to ${value}`,
                })),
            });
        }

        // Create interaction records for reassignment
        if (action === 'reassign') {
            await prisma.interaction.createMany({
                data: leadIds.map((id: string) => ({
                    leadId: id,
                    userId: session.user.id,
                    type: 'assignment_change' as const,
                    direction: 'internal' as const,
                    summary: `Batch reassignment`,
                    metadata: { to: value },
                })),
            });
        }

        return NextResponse.json({
            success: true,
            count: result.count,
            message: `${result.count} lead(s) updated: ${actionLabel}`,
        });
    } catch (error) {
        console.error('Error batch updating leads:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
