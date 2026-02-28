'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useSidebar } from './sidebar-context';
import {
    LayoutDashboard,
    Users,
    PhoneCall,
    Settings,
    Upload,
    BarChart3,
    UserCircle,
    User,
    X,
    Kanban,
} from 'lucide-react';

interface SidebarProps {
    userRole: 'admin' | 'advisor';
    userName: string;
}

const advisorNavItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/pipeline', label: 'Pipeline Board', icon: Kanban },
    { href: '/leads', label: 'My Leads', icon: Users },
    { href: '/call-list', label: 'Daily Call List', icon: PhoneCall },
    { href: '/profile', label: 'My Profile', icon: UserCircle },
];

const adminNavItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/pipeline', label: 'Pipeline Board', icon: Kanban },
    { href: '/leads', label: 'All Leads', icon: Users },
    { href: '/call-list', label: 'Daily Call List', icon: PhoneCall },
    { href: '/import', label: 'Import Leads', icon: Upload },
    { href: '/reports', label: 'Reports', icon: BarChart3 },
    { href: '/users', label: 'User Management', icon: UserCircle },
    { href: '/settings', label: 'Settings', icon: Settings },
    { href: '/profile', label: 'My Profile', icon: User },
];

export function Sidebar({ userRole, userName }: SidebarProps) {
    const pathname = usePathname();
    const { isOpen, close } = useSidebar();

    const navItems = userRole === 'admin' ? adminNavItems : advisorNavItems;

    // Auto-close sidebar on route change (for mobile)
    useEffect(() => {
        close();
    }, [pathname, close]);

    return (
        <>
            {/* Mobile overlay backdrop */}
            <div
                className={cn('sidebar-overlay', isOpen && 'active')}
                onClick={close}
                aria-hidden="true"
            />

            <aside className={cn('sidebar', isOpen && 'mobile-open')}>
                {/* Logo Header */}
                <div className="p-5 border-b border-[hsl(222,47%,15%)] flex items-center justify-between">
                    <Link href="/dashboard" className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30 shrink-0">
                            <span className="text-white font-bold text-lg">P</span>
                        </div>
                        <div>
                            <h1 className="font-bold text-lg bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                                Prime CRM
                            </h1>
                            <p className="text-xs text-gray-400">Loan Advisors</p>
                        </div>
                    </Link>

                    {/* Mobile close button */}
                    <button
                        className="md:hidden p-1.5 rounded-lg hover:bg-[hsl(222,47%,16%)] text-gray-300 transition-colors"
                        onClick={close}
                        aria-label="Close menu"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 py-3 overflow-y-auto">
                    <div className="px-4 mb-2">
                        <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                            Main Menu
                        </span>
                    </div>
                    {navItems.map((item) => {
                        const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn('sidebar-item', isActive && 'active')}
                            >
                                <item.icon className="w-5 h-5" />
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>

                {/* User Info */}
                <div className="p-4 border-t border-[hsl(222,47%,15%)]">
                    <Link
                        href="/profile"
                        className="flex items-center gap-3 p-3 rounded-xl bg-[hsl(222,47%,12%)] hover:bg-[hsl(222,47%,14%)] transition-colors"
                    >
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-semibold">
                            {userName.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{userName}</p>
                            <p className="text-xs text-gray-400 capitalize">{userRole}</p>
                        </div>
                    </Link>
                </div>
            </aside>
        </>
    );
}
