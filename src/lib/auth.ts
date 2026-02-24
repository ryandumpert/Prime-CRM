import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { redirect } from 'next/navigation';

export async function getSession() {
    return await getServerSession(authOptions);
}

export async function getCurrentUser() {
    const session = await getSession();
    return session?.user;
}

export async function requireAuth() {
    const user = await getCurrentUser();
    if (!user) {
        redirect('/login');
    }
    return user;
}

export async function requireAdmin() {
    const user = await requireAuth();
    if (user.role !== 'admin') {
        redirect('/dashboard');
    }
    return user;
}

export async function requireAdvisor() {
    const user = await requireAuth();
    // Both admin and advisor can access advisor pages
    return user;
}
