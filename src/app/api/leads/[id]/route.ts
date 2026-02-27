import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import prisma from '@/lib/db';
import { isValidTransition, shouldUpdateLastContacted, LeadStatusType, PipelineType, PIPELINES, PIPELINE_STATUSES, PIPELINE_ENTRY_STATUS, PIPELINE_TRANSFERS, isStatusValidForPipeline } from '@/lib/constants';

// GET /api/leads/[id] - Get a single lead with interactions
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;

        const lead = await prisma.lead.findUnique({
            where: { id },
            include: {
                assignedAdvisor: {
                    select: { id: true, displayName: true, email: true },
                },
                interactions: {
                    include: {
                        user: {
                            select: { id: true, displayName: true },
                        },
                    },
                    orderBy: { occurredAt: 'desc' },
                    take: 50,
                },
            },
        });

        if (!lead || lead.archived) {
            return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
        }

        // Check access: advisors can only view their assigned leads
        if (session.user.role === 'advisor' && lead.assignedAdvisorUserId !== session.user.id) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        return NextResponse.json({ data: lead });
    } catch (error) {
        console.error('Error fetching lead:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// PATCH /api/leads/[id] - Update a lead
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const body = await request.json();

        // Get existing lead
        const existingLead = await prisma.lead.findUnique({
            where: { id },
        });

        if (!existingLead) {
            return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
        }

        // Check access
        if (session.user.role === 'advisor' && existingLead.assignedAdvisorUserId !== session.user.id) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const {
            status,
            priority,
            nextActionAt,
            doNotCall,
            doNotText,
            doNotEmail,
            assignedAdvisorUserId,
            firstName,
            lastName,
            fullName,
            phonePrimary,
            emailPrimary,
            pipeline,
        } = body;

        // Validate status transition if status is being changed
        if (status && status !== existingLead.status) {
            const isAdmin = session.user.role === 'admin';
            const isTerminal = ['CLOSED_FUNDED', 'NOT_INTERESTED', 'UNQUALIFIED', 'LOST', 'DO_NOT_CONTACT'].includes(existingLead.status);

            if (isTerminal && !isAdmin) {
                return NextResponse.json({ error: 'Cannot change status from terminal state' }, { status: 400 });
            }

            // If a pipeline transfer is also happening, validate against the target pipeline
            const isPipelineTransfer = pipeline !== undefined && pipeline !== existingLead.pipeline && PIPELINES.includes(pipeline);
            const effectivePipeline = isPipelineTransfer ? (pipeline as PipelineType) : (existingLead.pipeline as PipelineType);

            // Allow within-pipeline moves (Kanban drag-and-drop) OR valid forward transitions
            const isWithinPipelineMove = isStatusValidForPipeline(status, effectivePipeline);

            if (!isAdmin && !isPipelineTransfer && !isWithinPipelineMove && !isValidTransition(existingLead.status as LeadStatusType, status)) {
                return NextResponse.json({ error: 'Invalid status transition' }, { status: 400 });
            }
        }

        // Build update data
        const updateData: any = {};

        if (status !== undefined) {
            updateData.status = status;
            updateData.statusUpdatedAt = new Date();
        }
        if (priority !== undefined) updateData.priority = priority;
        if (nextActionAt !== undefined) updateData.nextActionAt = nextActionAt ? new Date(nextActionAt) : null;
        if (doNotCall !== undefined) updateData.doNotCall = doNotCall;
        if (doNotText !== undefined) updateData.doNotText = doNotText;
        if (doNotEmail !== undefined) updateData.doNotEmail = doNotEmail;
        if (firstName !== undefined) updateData.firstName = firstName;
        if (lastName !== undefined) updateData.lastName = lastName;
        if (fullName !== undefined) updateData.fullName = fullName;
        if (phonePrimary !== undefined) updateData.phonePrimary = phonePrimary;
        if (emailPrimary !== undefined) updateData.emailPrimary = emailPrimary?.toLowerCase();

        // Only admins can reassign leads
        if (assignedAdvisorUserId !== undefined && session.user.role === 'admin') {
            updateData.assignedAdvisorUserId = assignedAdvisorUserId;
        }

        // Handle pipeline transfer
        if (pipeline !== undefined && pipeline !== existingLead.pipeline && PIPELINES.includes(pipeline)) {
            const currentPipeline = existingLead.pipeline as PipelineType;
            const newPipeline = pipeline as PipelineType;

            // Validate the transfer is allowed
            if (!PIPELINE_TRANSFERS[currentPipeline]?.includes(newPipeline)) {
                return NextResponse.json({ error: `Cannot transfer from ${currentPipeline} to ${newPipeline}` }, { status: 400 });
            }

            updateData.pipeline = newPipeline;

            // If no explicit status was provided, set to the pipeline's entry status
            if (!status) {
                updateData.status = PIPELINE_ENTRY_STATUS[newPipeline];
                updateData.statusUpdatedAt = new Date();
            }
        }

        // Update lead
        const updatedLead = await prisma.lead.update({
            where: { id },
            data: updateData,
            include: {
                assignedAdvisor: {
                    select: { id: true, displayName: true },
                },
            },
        });

        // Create audit log
        await prisma.auditLog.create({
            data: {
                actorUserId: session.user.id,
                entityType: 'lead',
                entityId: id,
                action: 'update',
                before: existingLead as any,
                after: updatedLead as any,
            },
        });

        // Create status change interaction if status changed
        if (status && status !== existingLead.status) {
            await prisma.interaction.create({
                data: {
                    leadId: id,
                    userId: session.user.id,
                    type: 'status_change',
                    direction: 'internal',
                    summary: `Status changed from ${existingLead.status} to ${status}`,
                    metadata: { from: existingLead.status, to: status },
                },
            });
        }

        // Create assignment change interaction if advisor changed
        if (assignedAdvisorUserId !== undefined && assignedAdvisorUserId !== existingLead.assignedAdvisorUserId) {
            await prisma.interaction.create({
                data: {
                    leadId: id,
                    userId: session.user.id,
                    type: 'assignment_change',
                    direction: 'internal',
                    summary: `Lead reassigned`,
                    metadata: {
                        from: existingLead.assignedAdvisorUserId,
                        to: assignedAdvisorUserId
                    },
                },
            });
        }

        // Create pipeline change interaction if pipeline changed
        if (pipeline !== undefined && pipeline !== existingLead.pipeline) {
            await prisma.interaction.create({
                data: {
                    leadId: id,
                    userId: session.user.id,
                    type: 'status_change',
                    direction: 'internal',
                    summary: `Pipeline changed from ${existingLead.pipeline} to ${pipeline}`,
                    metadata: {
                        fromPipeline: existingLead.pipeline,
                        toPipeline: pipeline,
                    },
                },
            });
        }

        return NextResponse.json({ data: updatedLead });
    } catch (error) {
        console.error('Error updating lead:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// DELETE /api/leads/[id] - Delete a lead (admin only)
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;

        const lead = await prisma.lead.findUnique({ where: { id } });
        if (!lead) {
            return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
        }

        await prisma.lead.delete({ where: { id } });

        // Create audit log
        await prisma.auditLog.create({
            data: {
                actorUserId: session.user.id,
                entityType: 'lead',
                entityId: id,
                action: 'delete',
                before: lead as any,
            },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting lead:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
