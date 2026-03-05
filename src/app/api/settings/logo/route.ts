import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import prisma from '@/lib/db';

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp'];
const MAX_SIZE = 2 * 1024 * 1024; // 2MB

const SETTINGS_KEY = 'company_logo';

// GET /api/settings/logo — return the current logo URL (data URI from DB)
export async function GET() {
    try {
        const setting = await prisma.crmSettings.findUnique({
            where: { key: SETTINGS_KEY },
        });

        const logoUrl = setting ? (setting.value as any)?.dataUrl ?? null : null;

        return NextResponse.json({ logoUrl });
    } catch (error) {
        console.error('Error fetching logo:', error);
        return NextResponse.json({ logoUrl: null });
    }
}

// POST /api/settings/logo — upload a new company logo (stored as base64 in DB)
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized - Admin only' }, { status: 401 });
        }

        const formData = await request.formData();
        const file = formData.get('logo') as File;

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        // Validate file type
        if (!ALLOWED_TYPES.includes(file.type)) {
            return NextResponse.json(
                { error: `Invalid file type. Allowed: PNG, JPEG, SVG, WebP` },
                { status: 400 }
            );
        }

        // Validate file size
        if (file.size > MAX_SIZE) {
            return NextResponse.json(
                { error: 'File too large. Maximum size is 2MB.' },
                { status: 400 }
            );
        }

        // Convert to base64 data URL
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64 = buffer.toString('base64');
        const dataUrl = `data:${file.type};base64,${base64}`;

        // Upsert into CrmSettings
        await prisma.crmSettings.upsert({
            where: { key: SETTINGS_KEY },
            update: {
                value: { dataUrl, fileName: file.name, mimeType: file.type, uploadedAt: new Date().toISOString() },
                updatedBy: session.user.id,
            },
            create: {
                key: SETTINGS_KEY,
                value: { dataUrl, fileName: file.name, mimeType: file.type, uploadedAt: new Date().toISOString() },
                updatedBy: session.user.id,
            },
        });

        return NextResponse.json({ success: true, logoUrl: dataUrl });
    } catch (error) {
        console.error('Error uploading logo:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// DELETE /api/settings/logo — remove the company logo (revert to default)
export async function DELETE() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized - Admin only' }, { status: 401 });
        }

        // Delete the setting if it exists
        await prisma.crmSettings.deleteMany({
            where: { key: SETTINGS_KEY },
        });

        return NextResponse.json({ success: true, logoUrl: null });
    } catch (error) {
        console.error('Error deleting logo:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
