import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { writeFile, readdir, unlink, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp'];
const MAX_SIZE = 2 * 1024 * 1024; // 2MB

// GET /api/settings/logo — return the current logo URL (if one exists)
export async function GET() {
    try {
        if (!existsSync(UPLOAD_DIR)) {
            return NextResponse.json({ logoUrl: null });
        }

        const files = await readdir(UPLOAD_DIR);
        const logoFile = files.find(f => f.startsWith('company-logo'));

        if (!logoFile) {
            return NextResponse.json({ logoUrl: null });
        }

        // Add cache-buster to force refresh when logo changes
        const stat = await import('fs/promises').then(fs => fs.stat(path.join(UPLOAD_DIR, logoFile)));
        const cacheBuster = stat.mtimeMs;

        return NextResponse.json({ logoUrl: `/uploads/${logoFile}?v=${cacheBuster}` });
    } catch (error) {
        console.error('Error fetching logo:', error);
        return NextResponse.json({ logoUrl: null });
    }
}

// POST /api/settings/logo — upload a new company logo
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

        // Ensure upload directory exists
        if (!existsSync(UPLOAD_DIR)) {
            await mkdir(UPLOAD_DIR, { recursive: true });
        }

        // Remove any existing logo files
        const existingFiles = await readdir(UPLOAD_DIR);
        for (const existingFile of existingFiles) {
            if (existingFile.startsWith('company-logo')) {
                await unlink(path.join(UPLOAD_DIR, existingFile));
            }
        }

        // Determine file extension
        const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
        const filename = `company-logo.${ext}`;
        const filepath = path.join(UPLOAD_DIR, filename);

        // Write file
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        await writeFile(filepath, buffer);

        const logoUrl = `/uploads/${filename}?v=${Date.now()}`;

        return NextResponse.json({ success: true, logoUrl });
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

        if (!existsSync(UPLOAD_DIR)) {
            return NextResponse.json({ success: true, logoUrl: null });
        }

        const files = await readdir(UPLOAD_DIR);
        for (const file of files) {
            if (file.startsWith('company-logo')) {
                await unlink(path.join(UPLOAD_DIR, file));
            }
        }

        return NextResponse.json({ success: true, logoUrl: null });
    } catch (error) {
        console.error('Error deleting logo:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
