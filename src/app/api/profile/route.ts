import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import prisma from '@/lib/db';

// GET /api/profile — Get current user profile
export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
            id: true,
            displayName: true,
            email: true,
            role: true,
            avatarUrl: true,
            active: true,
            createdAt: true,
            updatedAt: true,
        },
    });

    if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ data: user });
}

// PUT /api/profile — Update current user profile
export async function PUT(request: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { displayName, avatarUrl } = body;

    const updateData: Record<string, any> = {};

    if (displayName !== undefined) {
        if (!displayName || displayName.trim().length < 2) {
            return NextResponse.json(
                { error: 'Display name must be at least 2 characters' },
                { status: 400 }
            );
        }
        updateData.displayName = displayName.trim();
    }

    if (avatarUrl !== undefined) {
        // Allow null to clear avatar, or validate it's a reasonable URL/data URI
        if (avatarUrl === null || avatarUrl === '') {
            updateData.avatarUrl = null;
        } else if (typeof avatarUrl === 'string') {
            updateData.avatarUrl = avatarUrl;
        }
    }

    if (Object.keys(updateData).length === 0) {
        return NextResponse.json(
            { error: 'No valid fields to update' },
            { status: 400 }
        );
    }

    const user = await prisma.user.update({
        where: { id: session.user.id },
        data: updateData,
        select: {
            id: true,
            displayName: true,
            email: true,
            role: true,
            avatarUrl: true,
            updatedAt: true,
        },
    });

    return NextResponse.json({ data: user });
}
