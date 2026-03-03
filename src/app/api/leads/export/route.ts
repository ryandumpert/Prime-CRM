import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import prisma from '@/lib/db';
import { TERMINAL_STATUSES, CALL_LIST_DAYS_THRESHOLD, PipelineType, PIPELINES } from '@/lib/constants';

// Escape CSV field (handles commas, quotes, newlines)
function csvEscape(value: string | null | undefined): string {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}

function formatDate(date: Date | string | null): string {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function formatDateTime(date: Date | string | null): string {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleString('en-US', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit',
    });
}

// GET /api/leads/export - Export leads as CSV with current filters
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const priority = searchParams.get('priority');
        const search = searchParams.get('search');
        const callListOnly = searchParams.get('callListOnly') === 'true';
        const pipeline = searchParams.get('pipeline') as PipelineType | null;

        // Build where clause (same logic as GET /api/leads)
        const where: any = { archived: false };

        if (session.user.role === 'advisor') {
            where.assignedAdvisorUserId = session.user.id;
        }

        if (status) where.status = status;
        if (priority) where.priority = priority;

        if (pipeline && PIPELINES.includes(pipeline)) {
            where.pipeline = pipeline;
        }

        if (search) {
            where.OR = [
                { firstName: { contains: search, mode: 'insensitive' } },
                { lastName: { contains: search, mode: 'insensitive' } },
                { fullName: { contains: search, mode: 'insensitive' } },
                { emailPrimary: { contains: search, mode: 'insensitive' } },
                { phonePrimary: { contains: search } },
            ];
        }

        if (callListOnly) {
            const fiveDaysAgo = new Date();
            fiveDaysAgo.setDate(fiveDaysAgo.getDate() - CALL_LIST_DAYS_THRESHOLD);
            where.status = { notIn: TERMINAL_STATUSES };
            where.OR = [
                { lastContactedAt: null },
                { lastContactedAt: { lt: fiveDaysAgo } },
            ];
        }

        // Fetch ALL matching leads (no pagination for export)
        const leads = await prisma.lead.findMany({
            where,
            include: {
                assignedAdvisor: {
                    select: { displayName: true },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        // Build CSV
        const headers = [
            'First Name',
            'Last Name',
            'Full Name',
            'Phone',
            'Email',
            'Status',
            'Pipeline',
            'Priority',
            'Assigned Advisor',
            'Loan Product',
            'Lead Source',
            'Date of Entry',
            'Last Contacted',
            'Next Action',
            'Do Not Call',
            'Do Not Text',
            'Do Not Email',
            'Created',
        ];

        const rows = leads.map(lead => [
            csvEscape(lead.firstName),
            csvEscape(lead.lastName),
            csvEscape(lead.fullName),
            csvEscape(lead.phonePrimary),
            csvEscape(lead.emailPrimary),
            csvEscape(lead.status),
            csvEscape(lead.pipeline),
            csvEscape(lead.priority),
            csvEscape(lead.assignedAdvisor?.displayName),
            csvEscape(lead.loanProduct),
            csvEscape(lead.leadSource),
            csvEscape(formatDate(lead.dateOfEntry)),
            csvEscape(formatDateTime(lead.lastContactedAt)),
            csvEscape(formatDateTime(lead.nextActionAt)),
            lead.doNotCall ? 'Yes' : 'No',
            lead.doNotText ? 'Yes' : 'No',
            lead.doNotEmail ? 'Yes' : 'No',
            csvEscape(formatDateTime(lead.createdAt)),
        ].join(','));

        const csv = [headers.join(','), ...rows].join('\r\n');

        // Generate filename with filters
        const parts = ['leads'];
        if (status) parts.push(status.toLowerCase());
        if (priority) parts.push(priority);
        if (pipeline) parts.push(pipeline);
        if (callListOnly) parts.push('call-list');
        if (search) parts.push('search');
        const now = new Date();
        parts.push(now.toISOString().slice(0, 10));
        const filename = parts.join('_') + '.csv';

        return new NextResponse(csv, {
            status: 200,
            headers: {
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': `attachment; filename="${filename}"`,
            },
        });
    } catch (error) {
        console.error('Error exporting leads:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
