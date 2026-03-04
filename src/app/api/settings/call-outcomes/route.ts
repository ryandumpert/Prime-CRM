import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import prisma from '@/lib/db';

// Default call outcomes (used as fallback if no CrmSettings entry exists)
const DEFAULT_CALL_OUTCOMES: CallOutcomeConfig[] = [
    { id: 'connected_interested', label: 'Connected – Interested', category: 'positive', countsAsContact: true, active: true, sortOrder: 0 },
    { id: 'connected_not_interested', label: 'Connected – Not Interested', category: 'negative', countsAsContact: true, active: true, sortOrder: 1 },
    { id: 'connected_callback', label: 'Connected – Callback Requested', category: 'positive', countsAsContact: true, active: true, sortOrder: 2 },
    { id: 'connected_needs_docs', label: 'Connected – Needs Documents', category: 'positive', countsAsContact: true, active: true, sortOrder: 3 },
    { id: 'left_voicemail', label: 'Left Voicemail', category: 'neutral', countsAsContact: true, active: true, sortOrder: 4 },
    { id: 'no_answer', label: 'No Answer', category: 'negative', countsAsContact: false, active: true, sortOrder: 5 },
    { id: 'busy', label: 'Busy / Line in Use', category: 'neutral', countsAsContact: false, active: true, sortOrder: 6 },
    { id: 'wrong_number', label: 'Wrong Number', category: 'negative', countsAsContact: false, active: true, sortOrder: 7 },
    { id: 'disconnected', label: 'Disconnected / Bad Number', category: 'negative', countsAsContact: false, active: true, sortOrder: 8 },
];

export interface CallOutcomeConfig {
    id: string;
    label: string;
    category: 'positive' | 'neutral' | 'negative';
    countsAsContact: boolean;
    active: boolean;
    sortOrder: number;
}

// GET /api/settings/call-outcomes — return the active call outcomes
export async function GET() {
    try {
        const setting = await prisma.crmSettings.findUnique({
            where: { key: 'call_outcomes' },
        });

        const outcomes: CallOutcomeConfig[] = setting
            ? (setting.value as unknown as CallOutcomeConfig[])
            : DEFAULT_CALL_OUTCOMES;

        return NextResponse.json({ data: outcomes });
    } catch (error) {
        console.error('Error fetching call outcomes:', error);
        // Fallback to defaults on error
        return NextResponse.json({ data: DEFAULT_CALL_OUTCOMES });
    }
}

// PUT /api/settings/call-outcomes — save the full outcomes list (admin only)
export async function PUT(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized - Admin only' }, { status: 401 });
        }

        const body = await request.json();
        const { outcomes } = body;

        if (!Array.isArray(outcomes)) {
            return NextResponse.json({ error: 'Invalid outcomes format' }, { status: 400 });
        }

        // Validate each outcome
        for (const outcome of outcomes) {
            if (!outcome.id || !outcome.label || !outcome.category) {
                return NextResponse.json(
                    { error: 'Each outcome must have id, label, and category' },
                    { status: 400 }
                );
            }
            if (!['positive', 'neutral', 'negative'].includes(outcome.category)) {
                return NextResponse.json(
                    { error: `Invalid category "${outcome.category}". Must be positive, neutral, or negative.` },
                    { status: 400 }
                );
            }
        }

        // Upsert the setting
        const setting = await prisma.crmSettings.upsert({
            where: { key: 'call_outcomes' },
            update: {
                value: outcomes,
                updatedBy: session.user.id,
            },
            create: {
                key: 'call_outcomes',
                value: outcomes,
                updatedBy: session.user.id,
            },
        });

        return NextResponse.json({ data: setting.value });
    } catch (error) {
        console.error('Error saving call outcomes:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
