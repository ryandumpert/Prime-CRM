import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import prisma from '@/lib/db';

// GET /api/templates - Get all message templates
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const type = searchParams.get('type'); // 'text', 'email', 'both'
        const category = searchParams.get('category');
        const activeOnly = searchParams.get('active') !== 'false';

        const where: any = {};
        if (activeOnly) where.active = true;
        if (category) where.category = category;
        if (type) {
            where.OR = [
                { type },
                { type: 'both' },
            ];
        }

        const templates = await prisma.messageTemplate.findMany({
            where,
            orderBy: [
                { category: 'asc' },
                { sortOrder: 'asc' },
                { name: 'asc' },
            ],
        });

        return NextResponse.json({ data: templates });
    } catch (error) {
        console.error('Error fetching templates:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST /api/templates - Create a new template (admin only)
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { name, category, type, subject, body: templateBody, sortOrder } = body;

        if (!name || !category || !type || !templateBody) {
            return NextResponse.json(
                { error: 'Name, category, type, and body are required' },
                { status: 400 }
            );
        }

        const validCategories = ['initial_outreach', 'follow_up', 'doc_request', 'rate_quote', 'general'];
        if (!validCategories.includes(category)) {
            return NextResponse.json(
                { error: `Invalid category. Must be one of: ${validCategories.join(', ')}` },
                { status: 400 }
            );
        }

        const validTypes = ['text', 'email', 'both'];
        if (!validTypes.includes(type)) {
            return NextResponse.json(
                { error: `Invalid type. Must be one of: ${validTypes.join(', ')}` },
                { status: 400 }
            );
        }

        const template = await prisma.messageTemplate.create({
            data: {
                name,
                category,
                type,
                subject: subject || null,
                body: templateBody,
                sortOrder: sortOrder || 0,
                createdBy: session.user.id,
            },
        });

        return NextResponse.json({ data: template }, { status: 201 });
    } catch (error) {
        console.error('Error creating template:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
