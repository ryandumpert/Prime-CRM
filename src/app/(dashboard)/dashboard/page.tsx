'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout';
import { Card, StatusBadge, PriorityBadge } from '@/components/ui';
import {
    Users,
    PhoneCall,
    CheckCircle,
    TrendingUp,
    Clock,
    ArrowRight,
    Loader2,
    CalendarDays,
    Phone,
    AlertTriangle,
    PhoneOutgoing
} from 'lucide-react';
import Link from 'next/link';
import { STATUS_LABELS, LeadStatusType, PriorityType, PIPELINE_LABELS, PipelineType } from '@/lib/constants';
import { formatPhoneDisplay } from '@/lib/utils';

interface DashboardStats {
    totalLeads: number;
    newLeads: number;
    activeLeads: number;
    closedLeads: number;
    callListCount: number;
    contactedToday: number;
    statusCounts: Record<LeadStatusType, number>;
    staleLeads?: { threePlus: number; sevenPlus: number; fourteenPlus: number };
    advisorStats?: Array<{
        advisorId: string;
        advisorName: string;
        totalLeads: number;
        callListCount: number;
        contactedToday: number;
        contactedThisWeek: number;
    }>;
}

interface ScheduleLead {
    id: string;
    firstName: string | null;
    lastName: string | null;
    fullName: string | null;
    phonePrimary: string | null;
    status: LeadStatusType;
    priority: PriorityType;
    nextActionAt: string;
    lastContactedAt: string | null;
    pipeline: PipelineType;
    assignedAdvisor: { id: string; displayName: string } | null;
}

interface QuotaData {
    advisorId: string;
    advisorName: string;
    minimumDailyCalls: number;
    callsToday: number;
    dailyProgress: number;
    quotaMet: boolean;
}

export default function DashboardPage() {
    const { data: session } = useSession();
    const router = useRouter();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [schedule, setSchedule] = useState<ScheduleLead[]>([]);
    const [quotas, setQuotas] = useState<QuotaData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const isAdmin = session?.user?.role === 'admin';

    useEffect(() => {
        fetchStats();
        fetchSchedule();
        fetchQuotas();
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

    const fetchSchedule = async () => {
        try {
            const res = await fetch('/api/dashboard/schedule');
            const data = await res.json();
            if (data.data) {
                setSchedule(data.data);
            }
        } catch (error) {
            console.error('Error fetching schedule:', error);
        }
    };

    const fetchQuotas = async () => {
        try {
            const res = await fetch('/api/reports/call-quotas');
            const data = await res.json();
            if (data.data) {
                setQuotas(data.data);
            }
        } catch (error) {
            console.error('Error fetching quotas:', error);
        }
    };

    // Build 5-day schedule buckets
    const getScheduleDays = () => {
        const days: { date: Date; label: string; shortDay: string; leads: ScheduleLead[] }[] = [];
        const now = new Date();

        for (let i = 0; i < 5; i++) {
            const d = new Date(now);
            d.setDate(d.getDate() + i);
            d.setHours(0, 0, 0, 0);

            const nextDay = new Date(d);
            nextDay.setDate(nextDay.getDate() + 1);

            const dayLeads = schedule.filter(lead => {
                const actionDate = new Date(lead.nextActionAt);
                return actionDate >= d && actionDate < nextDay;
            });

            const label = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-US', { weekday: 'short' });
            const shortDay = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

            days.push({ date: d, label, shortDay, leads: dayLeads });
        }
        return days;
    };

    const getLeadName = (lead: ScheduleLead) => {
        if (lead.fullName) return lead.fullName;
        if (lead.firstName || lead.lastName) return `${lead.firstName || ''} ${lead.lastName || ''}`.trim();
        return 'Unknown';
    };

    const getActionTime = (nextActionAt: string) => {
        const d = new Date(nextActionAt);
        const h = d.getHours();
        const m = d.getMinutes();
        // If time is midnight (00:00), it's a date-only entry
        if (h === 0 && m === 0) return 'All day';
        return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
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

            {/* Stale Leads Alert */}
            {stats?.staleLeads && stats.staleLeads.threePlus > 0 && (
                <Card className="mb-6 border-orange-500/20">
                    <div className="flex items-start gap-4">
                        <div className="p-3 rounded-xl bg-red-500/15 shrink-0">
                            <AlertTriangle className="w-6 h-6 text-red-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-semibold mb-1">Leads Need Attention</h3>
                            <p className="text-sm text-gray-400 mb-4">These leads haven&apos;t been contacted recently and may go cold</p>

                            <div className="grid grid-cols-3 gap-3">
                                {/* 14+ days */}
                                {stats.staleLeads.fourteenPlus > 0 && (
                                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                                        <div className="text-2xl font-bold text-red-400">{stats.staleLeads.fourteenPlus}</div>
                                        <div className="text-xs text-red-300 mt-0.5">14+ days</div>
                                        <div className="text-[10px] text-red-400/60 mt-0.5">Critical</div>
                                    </div>
                                )}
                                {/* 7+ days */}
                                {stats.staleLeads.sevenPlus > stats.staleLeads.fourteenPlus && (
                                    <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
                                        <div className="text-2xl font-bold text-orange-400">{stats.staleLeads.sevenPlus - stats.staleLeads.fourteenPlus}</div>
                                        <div className="text-xs text-orange-300 mt-0.5">7–13 days</div>
                                        <div className="text-[10px] text-orange-400/60 mt-0.5">Warning</div>
                                    </div>
                                )}
                                {/* 3+ days */}
                                {stats.staleLeads.threePlus > stats.staleLeads.sevenPlus && (
                                    <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                                        <div className="text-2xl font-bold text-amber-400">{stats.staleLeads.threePlus - stats.staleLeads.sevenPlus}</div>
                                        <div className="text-xs text-amber-300 mt-0.5">3–6 days</div>
                                        <div className="text-[10px] text-amber-400/60 mt-0.5">Caution</div>
                                    </div>
                                )}
                            </div>
                        </div>
                        <Link href="/pipeline" className="shrink-0">
                            <button className="btn btn-sm bg-red-500/15 border border-red-500/30 text-red-300 hover:bg-red-500/25 px-3 py-2 rounded-lg text-sm font-medium transition-colors">
                                View in Pipeline <ArrowRight className="w-3.5 h-3.5 ml-1 inline" />
                            </button>
                        </Link>
                    </div>
                </Card>
            )}

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
                        <div className="text-center py-8 text-gray-400">
                            <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
                            <p>No leads requiring follow-up</p>
                            <p className="text-sm">All leads have been contacted within 5 days</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <p className="text-gray-300">
                                <span className="text-xl font-bold text-white">{stats?.callListCount}</span> leads need follow-up
                            </p>
                            <p className="text-sm text-gray-400">
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
                                    <span className="text-gray-300 font-medium">{count}</span>
                                </div>
                            ))}
                    </div>
                    {stats?.statusCounts && Object.values(stats.statusCounts).every(c => c === 0) && (
                        <div className="text-center py-8 text-gray-400">
                            <p>No leads in pipeline</p>
                            <p className="text-sm">Import leads to get started</p>
                        </div>
                    )}
                </Card>
            </div>

            {/* 5-Day Follow-Up Schedule */}
            <Card className="mb-6">
                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-indigo-500/20">
                            <CalendarDays className="w-5 h-5 text-indigo-400" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold">5-Day Follow-Up Schedule</h3>
                            <p className="text-sm text-gray-400">Upcoming calls based on scheduled follow-up dates</p>
                        </div>
                    </div>
                    <span className="text-sm text-gray-400">
                        {schedule.length} {schedule.length === 1 ? 'lead' : 'leads'} scheduled
                    </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                    {getScheduleDays().map((day, dayIndex) => {
                        const isToday = dayIndex === 0;
                        return (
                            <div
                                key={day.shortDay}
                                className={`rounded-xl border transition-colors ${isToday
                                    ? 'border-indigo-500/40 bg-indigo-500/5'
                                    : 'border-[hsl(222,47%,18%)] bg-[hsl(222,47%,9%)]'
                                    }`}
                            >
                                {/* Day header */}
                                <div className={`px-4 py-3 border-b ${isToday ? 'border-indigo-500/30' : 'border-[hsl(222,47%,18%)]'
                                    }`}>
                                    <div className="flex items-center justify-between">
                                        <span className={`font-semibold text-sm ${isToday ? 'text-indigo-300' : 'text-gray-200'
                                            }`}>
                                            {day.label}
                                        </span>
                                        {day.leads.length > 0 && (
                                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${isToday
                                                ? 'bg-indigo-500/20 text-indigo-300'
                                                : 'bg-[hsl(222,47%,18%)] text-gray-300'
                                                }`}>
                                                {day.leads.length}
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-xs text-gray-400">{day.shortDay}</span>
                                </div>

                                {/* Lead cards */}
                                <div className="p-2 space-y-2 min-h-[80px]">
                                    {day.leads.length === 0 ? (
                                        <div className="flex items-center justify-center h-[64px] text-gray-600">
                                            <p className="text-xs text-center">No calls<br />scheduled</p>
                                        </div>
                                    ) : (
                                        day.leads.map(lead => (
                                            <div
                                                key={lead.id}
                                                className="p-3 rounded-lg bg-[hsl(222,47%,12%)] hover:bg-[hsl(222,47%,15%)] border border-[hsl(222,47%,18%)] hover:border-[hsl(222,47%,22%)] transition-all cursor-pointer group"
                                                onClick={() => router.push(`/leads/${lead.id}`)}
                                            >
                                                <div className="flex items-start justify-between gap-2 mb-2">
                                                    <span className="font-medium text-sm text-white truncate leading-tight">
                                                        {getLeadName(lead)}
                                                    </span>
                                                    <div className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${lead.priority === 'high' ? 'bg-red-500' :
                                                        lead.priority === 'normal' ? 'bg-blue-500' : 'bg-gray-500'
                                                        }`} />
                                                </div>
                                                <div className="flex items-center justify-between gap-2">
                                                    <StatusBadge status={lead.status} size="sm" />
                                                    <span className="text-[11px] text-gray-400 whitespace-nowrap">
                                                        {getActionTime(lead.nextActionAt)}
                                                    </span>
                                                </div>
                                                {lead.phonePrimary && (
                                                    <div className="flex items-center gap-1.5 mt-2 text-gray-400 group-hover:text-gray-300 transition-colors">
                                                        <Phone className="w-3 h-3" />
                                                        <span className="text-xs">{formatPhoneDisplay(lead.phonePrimary)}</span>
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </Card>

            {/* Advisor Stats (Admin Only) */}
            {isAdmin && stats?.advisorStats && stats.advisorStats.length > 0 && (
                <Card>
                    <h3 className="text-lg font-semibold mb-6">Advisor Performance</h3>

                    {/* Column Headers */}
                    <div className="grid grid-cols-[1fr_repeat(4,80px)] md:grid-cols-[1fr_repeat(4,100px)] gap-2 px-4 mb-3">
                        <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Advisor</span>
                        <span className="text-xs font-medium text-gray-400 uppercase tracking-wider text-center">Leads</span>
                        <span className="text-xs font-medium text-gray-400 uppercase tracking-wider text-center">Call List</span>
                        <span className="text-xs font-medium text-gray-400 uppercase tracking-wider text-center">Daily Quota</span>
                        <span className="text-xs font-medium text-gray-400 uppercase tracking-wider text-center">Week</span>
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
                                            : 'text-gray-400'
                                        }`}>
                                        {advisor.callListCount}
                                    </span>
                                </div>

                                {/* Daily Quota Progress */}
                                <div className="text-center">
                                    {(() => {
                                        const quota = quotas.find(q => q.advisorId === advisor.advisorId);
                                        if (!quota) {
                                            return (
                                                <span className={`text-lg font-bold ${advisor.contactedToday > 0 ? 'text-green-400' : 'text-gray-400'}`}>
                                                    {advisor.contactedToday}
                                                </span>
                                            );
                                        }
                                        return (
                                            <div className="flex flex-col items-center gap-1">
                                                <span className={`text-sm font-bold ${quota.quotaMet ? 'text-green-400' :
                                                        quota.dailyProgress >= 50 ? 'text-yellow-400' :
                                                            'text-red-400'
                                                    }`}>
                                                    {quota.callsToday}/{quota.minimumDailyCalls}
                                                </span>
                                                <div className="w-full h-1.5 rounded-full bg-gray-700 overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full transition-all duration-500 ${quota.quotaMet ? 'bg-green-500' :
                                                                quota.dailyProgress >= 50 ? 'bg-yellow-500' :
                                                                    'bg-red-500'
                                                            }`}
                                                        style={{ width: `${Math.min(quota.dailyProgress, 100)}%` }}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>

                                {/* This Week */}
                                <div className="text-center">
                                    <span className={`text-lg font-bold ${advisor.contactedThisWeek > 0 ? 'text-blue-400' : 'text-gray-400'
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
