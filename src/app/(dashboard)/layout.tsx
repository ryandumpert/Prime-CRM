import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { Sidebar, SidebarProvider } from '@/components/layout';
import { ShieldCheck } from 'lucide-react';

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
        redirect('/login');
    }

    const isAdmin = session.user.role === 'admin';

    return (
        <SidebarProvider>
            <div className="min-h-screen">
                <Sidebar
                    userRole={session.user.role}
                    userName={session.user.name}
                />
                <main className="page-container">
                    {isAdmin && (
                        <div className="admin-mode-banner">
                            <ShieldCheck className="w-4 h-4" />
                            <span>ADMIN MODE</span>
                        </div>
                    )}
                    {children}
                </main>
            </div>
        </SidebarProvider>
    );
}
