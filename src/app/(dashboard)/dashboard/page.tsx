'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Header } from '@/components/layout';
import { Card, StatusBadge } from '@/components/ui';
import {
    Users,
    PhoneCall,
    CheckCircle,
    TrendingUp,
    Clock,
    ArrowRight,
    Loader2
} from 'lucide-react';
import Link from 'next/link';
import { STATUS_LABELS, LeadStatusType } from '@/lib/constants';

interface DashboardStats {
    totalLeads: number;
    newLeads: number;
    activeLeads: number;
    closedLeads: number;
    callListCount: number;
    contactedToday: number;
    statusCounts: Record<LeadStatusType, number>;
    advisorStats?: Array<{
        advisorId: string;
        advisorName: string;
        totalLeads: number;
        callListCount: number;
        contactedToday: number;
        contactedThisWeek: number;
    }>;
}

export default function DashboardPage() {
    const { data: session } = useSession();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const isAdmin = session?.user?.role === 'admin';

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const res = await fetch('/api/dashboard/stats');
            const data = await res.json();
            if (data.data) {
                setStats(data.data);
            }
        } catch (error) {
            console.error('Error fetching stats:', error);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }

    const statCards = [
        {
            label: 'Total Leads',
            value: stats?.totalLeads || 0,
            icon: Users,
            color: 'from-blue-500 to-blue-600',
            iconBg: 'bg-blue-500/20',
        },
        {
            label: 'Daily Call List',
            value: stats?.callListCount || 0,
            icon: PhoneCall,
            color: 'from-orange-500 to-orange-600',
            iconBg: 'bg-orange-500/20',
            link: '/call-list',
        },
        {
            label: 'Contacted Today',
            value: stats?.contactedToday || 0,
            icon: CheckCircle,
            color: 'from-green-500 to-green-600',
            iconBg: 'bg-green-500/20',
        },
        {
            label: 'Closed/Funded',
            value: stats?.closedLeads || 0,
            icon: TrendingUp,
            color: 'from-purple-500 to-purple-600',
            iconBg: 'bg-purple-500/20',
        },
    ];

    return (
        <>
            <Header
                title={`Welcome back, ${session?.user?.name?.split(' ')[0] || 'User'}`}
                subtitle={isAdmin ? 'Admin Dashboard Overview' : 'Your Lead Management Dashboard'}
            />

            {/* Stats Grid */}
            <div className="stats-grid">
                {statCards.map((stat) => (
                    <Card
                        key={stat.label}
                        hover={!!stat.link}
                        className={stat.link ? '' : ''}
                    >
                        {stat.link ? (
                            <Link href={stat.link} className="block">
                                <StatCardContent stat={stat} />
                            </Link>
                        ) : (
                            <StatCardContent stat={stat} />
                        )}
                    </Card>
                ))}
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Call List Preview */}
                <Card>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold">Daily Call List</h3>
                        <Link
                            href="/call-list"
                            className="text-blue-400 hover:text-blue-300 text-sm flex items-center gap-1"
                        >
                            View All <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>
                    {stats?.callListCount === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
                            <p>No leads requiring follow-up</p>
                            <p className="text-sm">All leads have been contacted within 5 days</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <p className="text-gray-400">
                                <span className="text-xl font-bold text-white">{stats?.callListCount}</span> leads need follow-up
                            </p>
                            <p className="text-sm text-gray-500">
                                Leads not contacted in the last 5 days
                            </p>
                            <Link href="/call-list">
                                <button className="btn btn-primary w-full mt-4">
                                    <PhoneCall className="w-4 h-4" />
                                    Start Calling Session
                                </button>
                            </Link>
                        </div>
                    )}
                </Card>

                {/* Pipeline Overview */}
                <Card>
                    <h3 className="text-lg font-semibold mb-4">Pipeline Overview</h3>
                    <div className="space-y-3">
                        {stats?.statusCounts && Object.entries(stats.statusCounts)
                            .filter(([_, count]) => count > 0)
                            .slice(0, 6)
                            .map(([status, count]) => (
                                <div key={status} className="flex items-center justify-between">
                                    <StatusBadge status={status as LeadStatusType} size="sm" />
                                    <span className="text-gray-400 font-medium">{count}</span>
                                </div>
                            ))}
                    </div>
                    {stats?.statusCounts && Object.values(stats.statusCounts).every(c => c === 0) && (
                        <div className="text-center py-8 text-gray-500">
                            <p>No leads in pipeline</p>
                            <p className="text-sm">Import leads to get started</p>
                        </div>
                    )}
                </Card>
            </div>

            {/* Advisor Stats (Admin Only) */}
            {isAdmin && stats?.advisorStats && stats.advisorStats.length > 0 && (
                <Card>
                    <h3 className="text-lg font-semibold mb-6">Advisor Performance</h3>

                    {/* Column Headers */}
                    <div className="grid grid-cols-[1fr_repeat(4,80px)] md:grid-cols-[1fr_repeat(4,100px)] gap-2 px-4 mb-3">
                        <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Advisor</span>
                        <span className="text-xs font-medium text-gray-500 uppercase tracking-wider text-center">Leads</span>
                        <span className="text-xs font-medium text-gray-500 uppercase tracking-wider text-center">Call List</span>
                        <span className="text-xs font-medium text-gray-500 uppercase tracking-wider text-center">Today</span>
                        <span className="text-xs font-medium text-gray-500 uppercase tracking-wider text-center">Week</span>
                    </div>

                    {/* Advisor Rows */}
                    <div className="space-y-2">
                        {stats.advisorStats.map((advisor) => (
                            <div
                                key={advisor.advisorId}
                                className="grid grid-cols-[1fr_repeat(4,80px)] md:grid-cols-[1fr_repeat(4,100px)] gap-2 items-center p-4 rounded-xl bg-[hsl(222,47%,10%)] hover:bg-[hsl(222,47%,12%)] transition-colors"
                            >
                                {/* Advisor Name with Avatar */}
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500/30 to-purple-500/30 border border-blue-500/20 flex items-center justify-center text-sm font-semibold text-blue-300 shrink-0">
                                        {advisor.advisorName.charAt(0).toUpperCase()}
                                    </div>
                                    <span className="font-medium truncate text-sm md:text-base">{advisor.advisorName}</span>
                                </div>

                                {/* Total Leads */}
                                <div className="text-center">
                                    <span className="text-lg font-bold">{advisor.totalLeads}</span>
                                </div>

                                {/* Call List */}
                                <div className="text-center">
                                    <span className={`text-lg font-bold ${advisor.callListCount > 10
                                        ? 'text-orange-400'
                                        : advisor.callListCount > 0
                                            ? 'text-yellow-400'
                                            : 'text-gray-500'
                                        }`}>
                                        {advisor.callListCount}
                                    </span>
                                </div>

                                {/* Contacted Today */}
                                <div className="text-center">
                                    <span className={`text-lg font-bold ${advisor.contactedToday > 0 ? 'text-green-400' : 'text-gray-500'
                                        }`}>
                                        {advisor.contactedToday}
                                    </span>
                                </div>

                                {/* This Week */}
                                <div className="text-center">
                                    <span className={`text-lg font-bold ${advisor.contactedThisWeek > 0 ? 'text-blue-400' : 'text-gray-500'
                                        }`}>
                                        {advisor.contactedThisWeek}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            )}
        </>
    );
}

function StatCardContent({ stat }: { stat: any }) {
    const Icon = stat.icon;
    return (
        <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
                <p className="stat-value">{stat.value}</p>
                <p className="stat-label">{stat.label}</p>
            </div>
            <div className={`p-2.5 rounded-xl ${stat.iconBg} shrink-0`}>
                <Icon className="w-5 h-5" style={{ color: stat.color.includes('blue') ? '#3b82f6' : stat.color.includes('orange') ? '#f97316' : stat.color.includes('green') ? '#22c55e' : '#a855f7' }} />
            </div>
        </div>
    );
}
