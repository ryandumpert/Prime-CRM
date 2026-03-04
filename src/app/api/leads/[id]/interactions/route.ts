import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import prisma from '@/lib/db';
import { shouldUpdateLastContacted } from '@/lib/constants';

// POST /api/leads/[id]/interactions - Create an interaction
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id: leadId } = await params;
        const body = await request.json();
        const { type, direction, outcome, summary, body: interactionBody, metadata } = body;

        // Verify lead exists and user has access
        const lead = await prisma.lead.findUnique({
            where: { id: leadId },
        });

        if (!lead) {
            return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
        }

        // Check access: advisors can only interact with their assigned leads
        if (session.user.role === 'advisor' && lead.assignedAdvisorUserId !== session.user.id) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Check compliance flags
        if (type === 'call' && lead.doNotCall) {
            return NextResponse.json({ error: 'Lead has Do Not Call flag' }, { status: 400 });
        }
        if (type === 'text' && lead.doNotText) {
            return NextResponse.json({ error: 'Lead has Do Not Text flag' }, { status: 400 });
        }
        if (type === 'email' && lead.doNotEmail) {
            return NextResponse.json({ error: 'Lead has Do Not Email flag' }, { status: 400 });
        }

        const occurredAt = new Date();

        // Create the interaction
        const interaction = await prisma.interaction.create({
            data: {
                leadId,
                userId: session.user.id,
                type,
                direction: direction || 'outbound',
                outcome,
                summary,
                body: interactionBody,
                occurredAt,
                metadata,
            },
            include: {
                user: {
                    select: { id: true, displayName: true },
                },
            },
        });

        // Build lead update data
        const leadUpdateData: any = {};

        // Update last_contacted_at based on interaction type and outcome
        if (type === 'call' && outcome) {
            // For calls, use the dynamic countsAsContact flag from CrmSettings
            let countsAsContact = false;
            try {
                const setting = await prisma.crmSettings.findUnique({
                    where: { key: 'call_outcomes' },
                });
                if (setting) {
                    const outcomes = setting.value as unknown as Array<{ id: string; countsAsContact: boolean }>;
                    const found = outcomes.find(o => o.id === outcome);
                    countsAsContact = found?.countsAsContact ?? false;
                } else {
                    // Fallback: use legacy logic for backward compatibility
                    countsAsContact = ['connected', 'left_voicemail', 'connected_interested',
                        'connected_not_interested', 'connected_callback', 'connected_needs_docs'].includes(outcome);
                }
            } catch {
                countsAsContact = shouldUpdateLastContacted(type, outcome);
            }
            if (countsAsContact) {
                leadUpdateData.lastContactedAt = occurredAt;
            }
        } else if (shouldUpdateLastContacted(type, outcome)) {
            // For text/email, use the existing static rules
            leadUpdateData.lastContactedAt = occurredAt;
        }

        // Increment call attempt counter for call-type interactions
        if (type === 'call') {
            leadUpdateData.callAttemptCount = { increment: 1 };
            leadUpdateData.lastCallAttemptAt = occurredAt;
        }

        // Apply lead updates if any
        if (Object.keys(leadUpdateData).length > 0) {
            await prisma.lead.update({
                where: { id: leadId },
                data: leadUpdateData,
            });
        }

        // Auto-update status based on interaction
        // If lead is NEW and call was attempted, move to ATTEMPTED_CONTACT
        if (lead.status === 'NEW' && type === 'call') {
            if (outcome === 'connected') {
                await prisma.lead.update({
                    where: { id: leadId },
                    data: { status: 'CONTACTED', statusUpdatedAt: occurredAt },
                });

                // Create status change interaction
                await prisma.interaction.create({
                    data: {
                        leadId,
                        userId: session.user.id,
                        type: 'status_change',
                        direction: 'internal',
                        summary: 'Status changed from NEW to CONTACTED',
                        metadata: { from: 'NEW', to: 'CONTACTED', automatic: true },
                    },
                });
            } else if (['attempted', 'no_answer', 'left_voicemail'].includes(outcome)) {
                await prisma.lead.update({
                    where: { id: leadId },
                    data: { status: 'ATTEMPTED_CONTACT', statusUpdatedAt: occurredAt },
                });

                // Create status change interaction
                await prisma.interaction.create({
                    data: {
                        leadId,
                        userId: session.user.id,
                        type: 'status_change',
                        direction: 'internal',
                        summary: 'Status changed from NEW to ATTEMPTED_CONTACT',
                        metadata: { from: 'NEW', to: 'ATTEMPTED_CONTACT', automatic: true },
                    },
                });
            }
        }

        return NextResponse.json({ data: interaction }, { status: 201 });
    } catch (error) {
        console.error('Error creating interaction:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// GET /api/leads/[id]/interactions - Get interactions for a lead
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id: leadId } = await params;
        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit') || '50');

        // Verify lead exists and user has access
        const lead = await prisma.lead.findUnique({
            where: { id: leadId },
        });

        if (!lead) {
            return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
        }

        if (session.user.role === 'advisor' && lead.assignedAdvisorUserId !== session.user.id) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const interactions = await prisma.interaction.findMany({
            where: { leadId },
            include: {
                user: {
                    select: { id: true, displayName: true },
                },
            },
            orderBy: { occurredAt: 'desc' },
            take: limit,
        });

        return NextResponse.json({ data: interactions });
    } catch (error) {
        console.error('Error fetching interactions:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
