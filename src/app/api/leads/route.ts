import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import prisma from '@/lib/db';
import { TERMINAL_STATUSES, CALL_LIST_DAYS_THRESHOLD } from '@/lib/constants';

// GET /api/leads - Get leads with filtering and pagination
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1');
        const pageSize = parseInt(searchParams.get('pageSize') || '20');
        const status = searchParams.get('status');
        const priority = searchParams.get('priority');
        const search = searchParams.get('search');
        const callListOnly = searchParams.get('callListOnly') === 'true';
        const sortField = searchParams.get('sortField') || 'createdAt';
        const sortDirection = searchParams.get('sortDirection') || 'desc';

        // Build where clause
        const where: any = { archived: false };

        // Role-based access: advisors can only see their assigned leads
        if (session.user.role === 'advisor') {
            where.assignedAdvisorUserId = session.user.id;
        }

        // Status filter
        if (status) {
            where.status = status;
        }

        // Priority filter
        if (priority) {
            where.priority = priority;
        }

        // Search filter
        if (search) {
            where.OR = [
                { firstName: { contains: search, mode: 'insensitive' } },
                { lastName: { contains: search, mode: 'insensitive' } },
                { fullName: { contains: search, mode: 'insensitive' } },
                { emailPrimary: { contains: search, mode: 'insensitive' } },
                { phonePrimary: { contains: search } },
            ];
        }

        // Daily Call List filter (per blueprint.md)
        if (callListOnly) {
            const fiveDaysAgo = new Date();
            fiveDaysAgo.setDate(fiveDaysAgo.getDate() - CALL_LIST_DAYS_THRESHOLD);

            where.status = { notIn: TERMINAL_STATUSES };
            where.OR = [
                { lastContactedAt: null },
                { lastContactedAt: { lt: fiveDaysAgo } },
            ];
        }

        // Get total count
        const total = await prisma.lead.count({ where });

        // Build orderBy for daily call list (per blueprint.md sorting)
        let orderBy: any = {};
        if (callListOnly) {
            // Priority DESC, next_action_at ASC (nulls last), last_contacted_at ASC (nulls first), created_at ASC
            orderBy = [
                { priority: 'desc' },
                { nextActionAt: 'asc' },
                { lastContactedAt: 'asc' },
                { createdAt: 'asc' },
            ];
        } else {
            orderBy = { [sortField]: sortDirection };
        }

        // Get leads with pagination
        const leads = await prisma.lead.findMany({
            where,
            include: {
                assignedAdvisor: {
                    select: { id: true, displayName: true, email: true },
                },
            },
            orderBy,
            skip: (page - 1) * pageSize,
            take: pageSize,
        });

        return NextResponse.json({
            data: leads,
            total,
            page,
            pageSize,
            totalPages: Math.ceil(total / pageSize),
        });
    } catch (error) {
        console.error('Error fetching leads:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST /api/leads - Create a new lead
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Only admins can create leads manually
        if (session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await request.json();
        const {
            firstName,
            lastName,
            fullName,
            phonePrimary,
            emailPrimary,
            assignedAdvisorUserId,
            priority,
        } = body;

        const lead = await prisma.lead.create({
            data: {
                firstName,
                lastName,
                fullName: fullName || `${firstName || ''} ${lastName || ''}`.trim() || null,
                phonePrimary,
                emailPrimary: emailPrimary?.toLowerCase(),
                assignedAdvisorUserId,
                priority: priority || 'normal',
                status: 'NEW',
            },
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
                entityId: lead.id,
                action: 'create',
                after: lead as any,
            },
        });

        return NextResponse.json({ data: lead }, { status: 201 });
    } catch (error) {
        console.error('Error creating lead:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
