import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import prisma from '@/lib/db';

// GET /api/leads/[id]/notes - Get notes-only feed for a lead
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
        const pinnedOnly = searchParams.get('pinned') === 'true';

        // Verify lead exists and user has access
        const lead = await prisma.lead.findUnique({
            where: { id: leadId },
            select: { id: true, assignedAdvisorUserId: true, archived: true },
        });

        if (!lead || lead.archived) {
            return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
        }

        if (session.user.role === 'advisor' && lead.assignedAdvisorUserId !== session.user.id) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Build where clause
        const where: any = {
            leadId,
            type: 'note',
        };

        if (pinnedOnly) {
            where.metadata = {
                path: ['pinned'],
                equals: true,
            };
        }

        // Fetch pinned notes first, then the rest chronologically
        const notes = await prisma.interaction.findMany({
            where,
            include: {
                user: {
                    select: { id: true, displayName: true },
                },
            },
            orderBy: { occurredAt: 'desc' },
            take: limit,
        });

        // Sort: pinned first, then by date
        const sorted = notes.sort((a, b) => {
            const aPinned = (a.metadata as any)?.pinned === true;
            const bPinned = (b.metadata as any)?.pinned === true;
            if (aPinned && !bPinned) return -1;
            if (!aPinned && bPinned) return 1;
            return new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime();
        });

        return NextResponse.json({ data: sorted });
    } catch (error) {
        console.error('Error fetching notes:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// PATCH /api/leads/[id]/notes - Update a note (pin/unpin)
export async function PATCH(
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
        const { noteId, pinned } = body;

        if (!noteId) {
            return NextResponse.json({ error: 'noteId is required' }, { status: 400 });
        }

        // Verify the note exists and belongs to this lead
        const note = await prisma.interaction.findFirst({
            where: { id: noteId, leadId, type: 'note' },
        });

        if (!note) {
            return NextResponse.json({ error: 'Note not found' }, { status: 404 });
        }

        // Verify lead access
        const lead = await prisma.lead.findUnique({
            where: { id: leadId },
            select: { assignedAdvisorUserId: true },
        });

        if (session.user.role === 'advisor' && lead?.assignedAdvisorUserId !== session.user.id) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Update the note metadata
        const existingMeta = (note.metadata as any) || {};
        const updatedNote = await prisma.interaction.update({
            where: { id: noteId },
            data: {
                metadata: { ...existingMeta, pinned: !!pinned },
            },
            include: {
                user: {
                    select: { id: true, displayName: true },
                },
            },
        });

        return NextResponse.json({ data: updatedNote });
    } catch (error) {
        console.error('Error updating note:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
