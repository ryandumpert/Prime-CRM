'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/components/layout';
import { Card, Button } from '@/components/ui';
import {
    BarChart3,
    Download,
    Loader2,
    TrendingUp,
    Phone,
    Users,
    Trophy,
    Crown,
    Medal,
    Target,
    Clock,
    ArrowUpRight,
    ArrowDownRight,
    Zap,
    PieChart,
    AlertTriangle
} from 'lucide-react';
import { STATUS_LABELS, LeadStatusType } from '@/lib/constants';

// ============================================================
// Interfaces
// ============================================================

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

interface LeaderboardEntry {
    advisorId: string;
    advisorName: string;
    totalLeads: number;
    activeLeads: number;
    callsToday: number;
    callsThisWeek: number;
    interactionsThisWeek: number;
    leadsContactedToday: number;
    leadsContactedThisWeek: number;
    leadsWarm: number;
    leadsProcessing: number;
    leadsFunded: number;
    avgResponseHours: number | null;
    conversionRate: number;
    followUpRate: number;
    overdueLeads: number;
}

interface LeadSourceEntry {
    source: string;
    total: number;
    contacted: number;
    contactedPct: number;
    warm: number;
    warmPct: number;
    processing: number;
    processingPct: number;
    funded: number;
    fundedPct: number;
    lost: number;
    notInterested: number;
    unqualified: number;
    newLeads: number;
    avgDaysToConvert: number | null;
    qualityScore: number;
}

interface LeadSourceData {
    sources: LeadSourceEntry[];
    summary: {
        totalSources: number;
        totalLeads: number;
        overallContactedPct: number;
        overallFundedPct: number;
        bestSource: string | null;
    };
}

type ReportTab = 'overview' | 'leaderboard' | 'sources';

// ============================================================
// Main Component
// ============================================================

export default function ReportsPage() {
    const [activeTab, setActiveTab] = useState<ReportTab>('overview');
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [sourceData, setSourceData] = useState<LeadSourceData | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, []);

    useEffect(() => {
        if (activeTab === 'leaderboard' && leaderboard.length === 0) {
            fetchLeaderboard();
        }
        if (activeTab === 'sources' && !sourceData) {
            fetchSources();
        }
    }, [activeTab]);

    const fetchStats = async () => {
        try {
            const res = await fetch('/api/dashboard/stats');
            const data = await res.json();
            setStats(data.data);
        } catch (error) {
            console.error('Error fetching stats:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchLeaderboard = async () => {
        try {
            const res = await fetch('/api/reports/leaderboard');
            const data = await res.json();
            setLeaderboard(data.data || []);
        } catch (error) {
            console.error('Error fetching leaderboard:', error);
        }
    };

    const fetchSources = async () => {
        try {
            const res = await fetch('/api/reports/lead-sources');
            const data = await res.json();
            setSourceData(data.data || null);
        } catch (error) {
            console.error('Error fetching sources:', error);
        }
    };

    const exportData = async (format: 'csv' | 'json') => {
        alert(`Export to ${format.toUpperCase()} - Feature coming soon`);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }

    const tabs: { key: ReportTab; label: string; icon: React.ElementType }[] = [
        { key: 'overview', label: 'Overview', icon: BarChart3 },
        { key: 'leaderboard', label: 'Leaderboard', icon: Trophy },
        { key: 'sources', label: 'Lead Sources', icon: PieChart },
    ];

    return (
        <>
            <Header
                title="Reports"
                subtitle="Pipeline analytics, team performance, and lead source insights"
            />

            {/* Tab Navigation */}
            <div className="flex items-center gap-1 mb-6 p-1 rounded-xl bg-[hsl(222,47%,11%)] border border-[hsl(222,47%,15%)] w-fit">
                {tabs.map(({ key, label, icon: Icon }) => (
                    <button
                        key={key}
                        onClick={() => setActiveTab(key)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === key
                                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                : 'text-gray-400 hover:text-gray-200 border border-transparent'
                            }`}
                    >
                        <Icon className="w-4 h-4" />
                        {label}
                    </button>
                ))}
            </div>

            {activeTab === 'overview' && <OverviewTab stats={stats} exportData={exportData} />}
            {activeTab === 'leaderboard' && <LeaderboardTab data={leaderboard} onRefresh={fetchLeaderboard} />}
            {activeTab === 'sources' && <SourcesTab data={sourceData} onRefresh={fetchSources} />}
        </>
    );
}

// ============================================================
// Overview Tab (existing reports content)
// ============================================================

function OverviewTab({ stats, exportData }: { stats: DashboardStats | null; exportData: (f: 'csv' | 'json') => void }) {
    const pipelineStages = stats?.statusCounts ? Object.entries(stats.statusCounts)
        .filter(([status]) => !['CLOSED_FUNDED', 'NOT_INTERESTED', 'UNQUALIFIED', 'LOST', 'DO_NOT_CONTACT'].includes(status))
        .map(([status, count]) => ({ status: status as LeadStatusType, count }))
        : [];

    const maxCount = Math.max(...pipelineStages.map(s => s.count), 1);

    return (
        <>
            <div className="flex flex-wrap justify-end gap-3 mb-6">
                <Button variant="secondary" onClick={() => exportData('csv')}>
                    <Download className="w-4 h-4" />
                    Export CSV
                </Button>
                <Button variant="secondary" onClick={() => exportData('json')}>
                    <Download className="w-4 h-4" />
                    Export JSON
                </Button>
            </div>

            {/* Overview Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <Card>
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-blue-500/20">
                            <Users className="w-6 h-6 text-blue-400" />
                        </div>
                        <div>
                            <p className="text-xl font-bold">{stats?.totalLeads || 0}</p>
                            <p className="text-sm text-gray-400">Total Leads</p>
                        </div>
                    </div>
                </Card>
                <Card>
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-green-500/20">
                            <TrendingUp className="w-6 h-6 text-green-400" />
                        </div>
                        <div>
                            <p className="text-xl font-bold">{stats?.closedLeads || 0}</p>
                            <p className="text-sm text-gray-400">Closed/Funded</p>
                        </div>
                    </div>
                </Card>
                <Card>
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-orange-500/20">
                            <Phone className="w-6 h-6 text-orange-400" />
                        </div>
                        <div>
                            <p className="text-xl font-bold">{stats?.callListCount || 0}</p>
                            <p className="text-sm text-gray-400">Needs Follow-up</p>
                        </div>
                    </div>
                </Card>
                <Card>
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-purple-500/20">
                            <BarChart3 className="w-6 h-6 text-purple-400" />
                        </div>
                        <div>
                            <p className="text-xl font-bold">{stats?.contactedToday || 0}</p>
                            <p className="text-sm text-gray-400">Contacted Today</p>
                        </div>
                    </div>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Pipeline Funnel */}
                <Card>
                    <h3 className="font-semibold mb-4">Pipeline Status Distribution</h3>
                    <div className="space-y-3">
                        {pipelineStages.map(({ status, count }) => (
                            <div key={status}>
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-sm text-gray-300">{STATUS_LABELS[status]}</span>
                                    <span className="text-sm font-medium">{count}</span>
                                </div>
                                <div className="h-2 bg-[hsl(222,47%,15%)] rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500"
                                        style={{ width: `${(count / maxCount) * 100}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>

                {/* Status Breakdown */}
                <Card>
                    <h3 className="font-semibold mb-4">All Statuses</h3>
                    <div className="overflow-x-auto max-h-64 overflow-y-auto">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Status</th>
                                    <th className="text-right">Count</th>
                                    <th className="text-right">%</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stats?.statusCounts && Object.entries(stats.statusCounts)
                                    .sort(([, a], [, b]) => b - a)
                                    .map(([status, count]) => (
                                        <tr key={status}>
                                            <td className="text-gray-200">{STATUS_LABELS[status as LeadStatusType]}</td>
                                            <td className="text-right">{count}</td>
                                            <td className="text-right text-gray-400">
                                                {stats.totalLeads > 0
                                                    ? ((count / stats.totalLeads) * 100).toFixed(1)
                                                    : 0}%
                                            </td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>

            {/* Advisor Performance (basic) */}
            {stats?.advisorStats && stats.advisorStats.length > 0 && (
                <Card>
                    <h3 className="font-semibold mb-4">Advisor Performance</h3>
                    <div className="overflow-x-auto">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Advisor</th>
                                    <th className="text-right">Total Leads</th>
                                    <th className="text-right">Needs Follow-up</th>
                                    <th className="text-right">Contacted Today</th>
                                    <th className="text-right">This Week</th>
                                    <th className="text-right">Follow-up Rate</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stats.advisorStats.map((advisor) => {
                                    const followUpRate = advisor.totalLeads > 0
                                        ? ((advisor.totalLeads - advisor.callListCount) / advisor.totalLeads * 100)
                                        : 100;
                                    return (
                                        <tr key={advisor.advisorId}>
                                            <td className="font-medium">{advisor.advisorName}</td>
                                            <td className="text-right">{advisor.totalLeads}</td>
                                            <td className="text-right">
                                                <span className={advisor.callListCount > 10 ? 'text-orange-400' : ''}>
                                                    {advisor.callListCount}
                                                </span>
                                            </td>
                                            <td className="text-right text-green-400">{advisor.contactedToday}</td>
                                            <td className="text-right">{advisor.contactedThisWeek}</td>
                                            <td className="text-right">
                                                <span className={followUpRate >= 80 ? 'text-green-400' : followUpRate >= 50 ? 'text-yellow-400' : 'text-red-400'}>
                                                    {followUpRate.toFixed(0)}%
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            {/* Conversion Metrics */}
            <Card className="mt-6">
                <h3 className="font-semibold mb-4">Conversion Metrics</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center p-4 rounded-xl bg-[hsl(222,47%,12%)]">
                        <p className="text-3xl font-bold text-blue-400">
                            {stats && stats.totalLeads > 0
                                ? ((stats.activeLeads / stats.totalLeads) * 100).toFixed(1)
                                : 0}%
                        </p>
                        <p className="text-sm text-gray-400 mt-1">Active Pipeline</p>
                    </div>
                    <div className="text-center p-4 rounded-xl bg-[hsl(222,47%,12%)]">
                        <p className="text-3xl font-bold text-green-400">
                            {stats && stats.totalLeads > 0
                                ? ((stats.closedLeads / stats.totalLeads) * 100).toFixed(1)
                                : 0}%
                        </p>
                        <p className="text-sm text-gray-400 mt-1">Closed Rate</p>
                    </div>
                    <div className="text-center p-4 rounded-xl bg-[hsl(222,47%,12%)]">
                        <p className="text-3xl font-bold text-purple-400">
                            {stats && stats.totalLeads > 0 && stats.closedLeads > 0
                                ? Math.round(stats.totalLeads / stats.closedLeads)
                                : '-'}
                        </p>
                        <p className="text-sm text-gray-400 mt-1">Leads per Close</p>
                    </div>
                </div>
            </Card>
        </>
    );
}

// ============================================================
// Leaderboard Tab (Feature #6)
// ============================================================

function LeaderboardTab({ data, onRefresh }: { data: LeaderboardEntry[]; onRefresh: () => void }) {
    if (data.length === 0) {
        return (
            <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }

    const getRankIcon = (index: number) => {
        if (index === 0) return <Crown className="w-5 h-5 text-yellow-400" />;
        if (index === 1) return <Medal className="w-5 h-5 text-gray-300" />;
        if (index === 2) return <Medal className="w-5 h-5 text-amber-600" />;
        return <span className="w-5 h-5 flex items-center justify-center text-sm text-gray-500 font-bold">{index + 1}</span>;
    };

    const getRankBorder = (index: number) => {
        if (index === 0) return 'border-yellow-500/30 bg-yellow-500/5';
        if (index === 1) return 'border-gray-400/20 bg-gray-400/5';
        if (index === 2) return 'border-amber-600/20 bg-amber-600/5';
        return '';
    };

    const formatResponseTime = (hours: number | null) => {
        if (hours === null) return '—';
        if (hours < 1) return `${Math.round(hours * 60)}m`;
        if (hours < 24) return `${hours}h`;
        return `${Math.round(hours / 24)}d`;
    };

    return (
        <>
            <div className="flex justify-end mb-4">
                <Button variant="secondary" onClick={onRefresh} size="sm">
                    <Loader2 className="w-4 h-4" />
                    Refresh
                </Button>
            </div>

            {/* Podium Cards - Top 3 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {data.slice(0, 3).map((advisor, index) => (
                    <Card key={advisor.advisorId} className={`border ${getRankBorder(index)} relative overflow-hidden`}>
                        <div className="absolute top-0 right-0 w-32 h-32 opacity-5">
                            <Trophy className="w-full h-full" />
                        </div>
                        <div className="flex items-center gap-3 mb-4">
                            {getRankIcon(index)}
                            <div>
                                <p className="font-semibold text-lg">{advisor.advisorName}</p>
                                <p className="text-xs text-gray-400">{advisor.totalLeads} total leads</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="p-2.5 rounded-lg bg-[hsl(222,47%,12%)]">
                                <p className="text-lg font-bold text-blue-400">{advisor.callsThisWeek}</p>
                                <p className="text-xs text-gray-400">Calls / Week</p>
                            </div>
                            <div className="p-2.5 rounded-lg bg-[hsl(222,47%,12%)]">
                                <p className="text-lg font-bold text-green-400">{advisor.leadsFunded}</p>
                                <p className="text-xs text-gray-400">Funded</p>
                            </div>
                            <div className="p-2.5 rounded-lg bg-[hsl(222,47%,12%)]">
                                <p className="text-lg font-bold text-orange-400">{advisor.leadsWarm}</p>
                                <p className="text-xs text-gray-400">Warm</p>
                            </div>
                            <div className="p-2.5 rounded-lg bg-[hsl(222,47%,12%)]">
                                <p className="text-lg font-bold text-purple-400">{advisor.conversionRate}%</p>
                                <p className="text-xs text-gray-400">Conversion</p>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>

            {/* Today's Activity */}
            <Card className="mb-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <Zap className="w-5 h-5 text-yellow-400" />
                    Today&apos;s Activity
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {data.map((advisor) => (
                        <div key={advisor.advisorId} className="p-3 rounded-xl bg-[hsl(222,47%,12%)] border border-[hsl(222,47%,15%)]">
                            <p className="font-medium text-sm truncate">{advisor.advisorName}</p>
                            <div className="flex items-center gap-3 mt-2">
                                <div>
                                    <p className="text-xl font-bold text-blue-400">{advisor.callsToday}</p>
                                    <p className="text-[10px] text-gray-500">calls</p>
                                </div>
                                <div className="w-px h-8 bg-[hsl(222,47%,18%)]" />
                                <div>
                                    <p className="text-xl font-bold text-green-400">{advisor.leadsContactedToday}</p>
                                    <p className="text-[10px] text-gray-500">contacted</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </Card>

            {/* Detailed Leaderboard Table */}
            <Card>
                <h3 className="font-semibold mb-4">Detailed Performance</h3>
                <div className="overflow-x-auto">
                    <table className="table">
                        <thead>
                            <tr>
                                <th className="w-8">#</th>
                                <th>Advisor</th>
                                <th className="text-right">Calls/Wk</th>
                                <th className="text-right">Contacted/Wk</th>
                                <th className="text-right">Warm</th>
                                <th className="text-right">Processing</th>
                                <th className="text-right">Funded</th>
                                <th className="text-right">Response</th>
                                <th className="text-right">Conversion</th>
                                <th className="text-right">Follow-Up</th>
                                <th className="text-right">Overdue</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.map((advisor, index) => (
                                <tr key={advisor.advisorId} className={index < 3 ? 'bg-[hsl(222,47%,12%)]' : ''}>
                                    <td>{getRankIcon(index)}</td>
                                    <td className="font-medium">{advisor.advisorName}</td>
                                    <td className="text-right">{advisor.callsThisWeek}</td>
                                    <td className="text-right">{advisor.leadsContactedThisWeek}</td>
                                    <td className="text-right text-orange-400">{advisor.leadsWarm}</td>
                                    <td className="text-right text-cyan-400">{advisor.leadsProcessing}</td>
                                    <td className="text-right text-green-400 font-medium">{advisor.leadsFunded}</td>
                                    <td className="text-right">
                                        <span className={
                                            advisor.avgResponseHours !== null && advisor.avgResponseHours <= 24
                                                ? 'text-green-400'
                                                : advisor.avgResponseHours !== null && advisor.avgResponseHours <= 48
                                                    ? 'text-yellow-400'
                                                    : 'text-gray-400'
                                        }>
                                            {formatResponseTime(advisor.avgResponseHours)}
                                        </span>
                                    </td>
                                    <td className="text-right">
                                        <span className={advisor.conversionRate >= 5 ? 'text-green-400' : advisor.conversionRate > 0 ? 'text-yellow-400' : 'text-gray-500'}>
                                            {advisor.conversionRate}%
                                        </span>
                                    </td>
                                    <td className="text-right">
                                        <span className={advisor.followUpRate >= 80 ? 'text-green-400' : advisor.followUpRate >= 50 ? 'text-yellow-400' : 'text-red-400'}>
                                            {advisor.followUpRate}%
                                        </span>
                                    </td>
                                    <td className="text-right">
                                        <span className={advisor.overdueLeads > 10 ? 'text-red-400' : advisor.overdueLeads > 5 ? 'text-orange-400' : 'text-gray-400'}>
                                            {advisor.overdueLeads}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </>
    );
}

// ============================================================
// Lead Sources Tab (Feature #7)
// ============================================================

function SourcesTab({ data, onRefresh }: { data: LeadSourceData | null; onRefresh: () => void }) {
    if (!data) {
        return (
            <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }

    const maxTotal = Math.max(...data.sources.map(s => s.total), 1);

    const getQualityColor = (score: number) => {
        if (score >= 20) return 'text-green-400';
        if (score >= 5) return 'text-blue-400';
        if (score >= 0) return 'text-gray-400';
        return 'text-red-400';
    };

    const getQualityLabel = (score: number) => {
        if (score >= 20) return 'Excellent';
        if (score >= 5) return 'Good';
        if (score >= 0) return 'Fair';
        return 'Poor';
    };

    return (
        <>
            <div className="flex justify-end mb-4">
                <Button variant="secondary" onClick={onRefresh} size="sm">
                    <Loader2 className="w-4 h-4" />
                    Refresh
                </Button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <Card>
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-blue-500/20">
                            <PieChart className="w-6 h-6 text-blue-400" />
                        </div>
                        <div>
                            <p className="text-xl font-bold">{data.summary.totalSources}</p>
                            <p className="text-sm text-gray-400">Lead Sources</p>
                        </div>
                    </div>
                </Card>
                <Card>
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-green-500/20">
                            <Target className="w-6 h-6 text-green-400" />
                        </div>
                        <div>
                            <p className="text-xl font-bold">{data.summary.overallContactedPct}%</p>
                            <p className="text-sm text-gray-400">Overall Contact Rate</p>
                        </div>
                    </div>
                </Card>
                <Card>
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-emerald-500/20">
                            <TrendingUp className="w-6 h-6 text-emerald-400" />
                        </div>
                        <div>
                            <p className="text-xl font-bold">{data.summary.overallFundedPct}%</p>
                            <p className="text-sm text-gray-400">Overall Funded Rate</p>
                        </div>
                    </div>
                </Card>
                <Card>
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-yellow-500/20">
                            <Crown className="w-6 h-6 text-yellow-400" />
                        </div>
                        <div>
                            <p className="text-xl font-bold truncate max-w-[140px]">{data.summary.bestSource || '—'}</p>
                            <p className="text-sm text-gray-400">Best Source</p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Source Volume Chart */}
            <Card className="mb-6">
                <h3 className="font-semibold mb-4">Lead Volume by Source</h3>
                <div className="space-y-3">
                    {data.sources.map((source) => (
                        <div key={source.source}>
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-sm text-gray-300 truncate max-w-[200px]">{source.source}</span>
                                <div className="flex items-center gap-3">
                                    <span className="text-sm font-medium">{source.total}</span>
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${source.qualityScore >= 20
                                            ? 'bg-green-500/20 text-green-400'
                                            : source.qualityScore >= 5
                                                ? 'bg-blue-500/20 text-blue-400'
                                                : source.qualityScore >= 0
                                                    ? 'bg-gray-500/20 text-gray-400'
                                                    : 'bg-red-500/20 text-red-400'
                                        }`}>
                                        {getQualityLabel(source.qualityScore)}
                                    </span>
                                </div>
                            </div>
                            <div className="h-2.5 bg-[hsl(222,47%,15%)] rounded-full overflow-hidden">
                                <div className="h-full rounded-full transition-all duration-500 flex">
                                    {/* Funded (green) */}
                                    {source.funded > 0 && (
                                        <div className="h-full bg-green-500" style={{ width: `${(source.funded / maxTotal) * 100}%` }} />
                                    )}
                                    {/* Processing (cyan) */}
                                    {source.processing > 0 && (
                                        <div className="h-full bg-cyan-500" style={{ width: `${(source.processing / maxTotal) * 100}%` }} />
                                    )}
                                    {/* Warm (orange) */}
                                    {source.warm > 0 && (
                                        <div className="h-full bg-orange-500" style={{ width: `${(source.warm / maxTotal) * 100}%` }} />
                                    )}
                                    {/* New/Cold (blue) */}
                                    {source.newLeads > 0 && (
                                        <div className="h-full bg-blue-500" style={{ width: `${(source.newLeads / maxTotal) * 100}%` }} />
                                    )}
                                    {/* Remaining (gray) */}
                                    <div className="h-full bg-gray-600" style={{
                                        width: `${((source.total - source.funded - source.processing - source.warm - source.newLeads) / maxTotal) * 100}%`
                                    }} />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="flex items-center gap-4 mt-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-green-500" /> Funded</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-cyan-500" /> Processing</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-orange-500" /> Warm</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> New</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-gray-600" /> Other</span>
                </div>
            </Card>

            {/* Detailed Source Table */}
            <Card>
                <h3 className="font-semibold mb-4">Source Performance Details</h3>
                <div className="overflow-x-auto">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Source</th>
                                <th className="text-right">Total</th>
                                <th className="text-right">Contacted</th>
                                <th className="text-right">Warm</th>
                                <th className="text-right">Processing</th>
                                <th className="text-right">Funded</th>
                                <th className="text-right">Lost</th>
                                <th className="text-right">Avg Days</th>
                                <th className="text-right">Quality</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.sources.map((source) => (
                                <tr key={source.source}>
                                    <td className="font-medium">{source.source}</td>
                                    <td className="text-right">{source.total}</td>
                                    <td className="text-right">
                                        <span className="text-gray-200">{source.contacted}</span>
                                        <span className="text-gray-500 text-xs ml-1">({source.contactedPct}%)</span>
                                    </td>
                                    <td className="text-right">
                                        <span className="text-orange-400">{source.warm}</span>
                                        <span className="text-gray-500 text-xs ml-1">({source.warmPct}%)</span>
                                    </td>
                                    <td className="text-right">
                                        <span className="text-cyan-400">{source.processing}</span>
                                        <span className="text-gray-500 text-xs ml-1">({source.processingPct}%)</span>
                                    </td>
                                    <td className="text-right">
                                        <span className="text-green-400 font-medium">{source.funded}</span>
                                        <span className="text-gray-500 text-xs ml-1">({source.fundedPct}%)</span>
                                    </td>
                                    <td className="text-right">
                                        <span className="text-red-400">{source.lost + source.notInterested + source.unqualified}</span>
                                    </td>
                                    <td className="text-right text-gray-300">
                                        {source.avgDaysToConvert !== null ? `${source.avgDaysToConvert}d` : '—'}
                                    </td>
                                    <td className="text-right">
                                        <span className={`font-medium ${getQualityColor(source.qualityScore)}`}>
                                            {source.qualityScore}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </>
    );
}
