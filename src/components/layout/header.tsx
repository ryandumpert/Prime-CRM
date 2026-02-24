'use client';

import { useState } from 'react';
import { signOut } from 'next-auth/react';
import { Button, Modal } from '@/components/ui';
import { useSidebar } from './sidebar-context';
import { Bell, LogOut, Search, Menu } from 'lucide-react';

interface HeaderProps {
    title: string;
    subtitle?: string;
}

export function Header({ title, subtitle }: HeaderProps) {
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const { toggle } = useSidebar();

    return (
        <>
            <header className="flex items-center justify-between mb-4 md:mb-8">
                <div className="flex items-center gap-3">
                    {/* Mobile menu toggle */}
                    <button
                        className="md:hidden p-2 -ml-2 rounded-lg hover:bg-[hsl(222,47%,16%)] text-gray-400 transition-colors"
                        onClick={toggle}
                        aria-label="Open menu"
                    >
                        <Menu className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="page-title">{title}</h1>
                        {subtitle && <p className="text-[hsl(215,20%,65%)] mt-1">{subtitle}</p>}
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {/* Search */}
                    <div className="relative hidden md:block">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input
                            type="text"
                            placeholder="Search leads..."
                            className="input w-64"
                            style={{ paddingLeft: '2.5rem' }}
                        />
                    </div>

                    {/* Notifications */}
                    <Button variant="ghost" size="icon" className="relative">
                        <Bell className="w-5 h-5" />
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] flex items-center justify-center text-white font-medium">
                            3
                        </span>
                    </Button>

                    {/* Logout */}
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setShowLogoutConfirm(true)}
                        title="Sign out"
                    >
                        <LogOut className="w-5 h-5" />
                    </Button>
                </div>
            </header>

            {/* Logout Confirmation Modal */}
            <Modal
                isOpen={showLogoutConfirm}
                onClose={() => setShowLogoutConfirm(false)}
                title="Sign Out"
                size="sm"
            >
                <div className="py-2">
                    <p className="text-gray-400 mb-6">
                        Are you sure you want to sign out? You will need to log back in to access the system.
                    </p>
                    <div className="flex justify-end gap-3">
                        <Button
                            variant="secondary"
                            onClick={() => setShowLogoutConfirm(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="danger"
                            onClick={() => signOut({ callbackUrl: '/login' })}
                        >
                            <LogOut className="w-4 h-4" />
                            Sign Out
                        </Button>
                    </div>
                </div>
            </Modal>
        </>
    );
}
