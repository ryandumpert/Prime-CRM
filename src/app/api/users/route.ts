import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import prisma from '@/lib/db';
import bcrypt from 'bcryptjs';

// GET /api/users - Get all users (admin only)
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const users = await prisma.user.findMany({
            select: {
                id: true,
                role: true,
                displayName: true,
                email: true,
                active: true,
                minimumDailyCalls: true,
                createdAt: true,
                updatedAt: true,
                _count: {
                    select: { assignedLeads: true },
                },
            },
            orderBy: { displayName: 'asc' },
        });

        return NextResponse.json({ data: users });
    } catch (error) {
        console.error('Error fetching users:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST /api/users - Create a new user (admin only)
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { email, password, displayName, role } = body;

        if (!email || !password || !displayName) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Check if email already exists
        const existingUser = await prisma.user.findUnique({
            where: { email: email.toLowerCase() },
        });

        if (existingUser) {
            return NextResponse.json({ error: 'Email already exists' }, { status: 400 });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await prisma.user.create({
            data: {
                email: email.toLowerCase(),
                password: hashedPassword,
                displayName,
                role: role || 'advisor',
            },
            select: {
                id: true,
                role: true,
                displayName: true,
                email: true,
                active: true,
                createdAt: true,
            },
        });

        // Audit log
        await prisma.auditLog.create({
            data: {
                actorUserId: session.user.id,
                entityType: 'user',
                entityId: user.id,
                action: 'create',
                after: user as any,
            },
        });

        return NextResponse.json({ data: user }, { status: 201 });
    } catch (error) {
        console.error('Error creating user:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
