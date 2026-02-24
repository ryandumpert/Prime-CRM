import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import prisma from '@/lib/db';
import bcrypt from 'bcryptjs';

// PUT /api/profile/password — Change password
export async function PUT(request: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
        return NextResponse.json(
            { error: 'Current password and new password are required' },
            { status: 400 }
        );
    }

    if (newPassword.length < 6) {
        return NextResponse.json(
            { error: 'New password must be at least 6 characters' },
            { status: 400 }
        );
    }

    // Get user with password
    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
    });

    if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify current password
    const isCurrentValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentValid) {
        return NextResponse.json(
            { error: 'Current password is incorrect' },
            { status: 400 }
        );
    }

    // Hash and save new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
        where: { id: session.user.id },
        data: { password: hashedPassword },
    });

    return NextResponse.json({ message: 'Password updated successfully' });
}
