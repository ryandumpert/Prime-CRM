import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import prisma from '@/lib/db';
import bcrypt from 'bcryptjs';

// GET /api/users/[id] - Get a single user
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;

        const user = await prisma.user.findUnique({
            where: { id },
            select: {
                id: true,
                role: true,
                displayName: true,
                email: true,
                active: true,
                createdAt: true,
                updatedAt: true,
                _count: {
                    select: { assignedLeads: true },
                },
            },
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        return NextResponse.json({ data: user });
    } catch (error) {
        console.error('Error fetching user:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// PATCH /api/users/[id] - Update a user
export async function PATCH(
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
        const { displayName, email, password, role, active } = body;

        const existingUser = await prisma.user.findUnique({ where: { id } });
        if (!existingUser) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const updateData: any = {};
        if (displayName !== undefined) updateData.displayName = displayName;
        if (email !== undefined) updateData.email = email.toLowerCase();
        if (role !== undefined) updateData.role = role;
        if (active !== undefined) updateData.active = active;
        if (password) {
            updateData.password = await bcrypt.hash(password, 10);
        }

        const user = await prisma.user.update({
            where: { id },
            data: updateData,
            select: {
                id: true,
                role: true,
                displayName: true,
                email: true,
                active: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        // Audit log
        await prisma.auditLog.create({
            data: {
                actorUserId: session.user.id,
                entityType: 'user',
                entityId: id,
                action: 'update',
                before: { ...existingUser, password: '[REDACTED]' } as any,
                after: { ...user } as any,
            },
        });

        return NextResponse.json({ data: user });
    } catch (error) {
        console.error('Error updating user:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// DELETE /api/users/[id] - Deactivate a user (soft delete)
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

        // Prevent self-deletion
        if (id === session.user.id) {
            return NextResponse.json({ error: 'Cannot deactivate yourself' }, { status: 400 });
        }

        const user = await prisma.user.update({
            where: { id },
            data: { active: false },
        });

        // Audit log
        await prisma.auditLog.create({
            data: {
                actorUserId: session.user.id,
                entityType: 'user',
                entityId: id,
                action: 'deactivate',
            },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deactivating user:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
