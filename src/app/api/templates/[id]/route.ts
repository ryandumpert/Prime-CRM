import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import prisma from '@/lib/db';

// PUT /api/templates/[id] - Update a template (admin only)
export async function PUT(
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
        const { name, category, type, subject, body: templateBody, sortOrder, active } = body;

        const existing = await prisma.messageTemplate.findUnique({ where: { id } });
        if (!existing) {
            return NextResponse.json({ error: 'Template not found' }, { status: 404 });
        }

        const updateData: any = {};
        if (name !== undefined) updateData.name = name;
        if (category !== undefined) updateData.category = category;
        if (type !== undefined) updateData.type = type;
        if (subject !== undefined) updateData.subject = subject;
        if (templateBody !== undefined) updateData.body = templateBody;
        if (sortOrder !== undefined) updateData.sortOrder = sortOrder;
        if (active !== undefined) updateData.active = active;

        const template = await prisma.messageTemplate.update({
            where: { id },
            data: updateData,
        });

        return NextResponse.json({ data: template });
    } catch (error) {
        console.error('Error updating template:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// DELETE /api/templates/[id] - Delete a template (admin only)
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

        const existing = await prisma.messageTemplate.findUnique({ where: { id } });
        if (!existing) {
            return NextResponse.json({ error: 'Template not found' }, { status: 404 });
        }

        await prisma.messageTemplate.delete({ where: { id } });

        return NextResponse.json({ message: 'Template deleted' });
    } catch (error) {
        console.error('Error deleting template:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
