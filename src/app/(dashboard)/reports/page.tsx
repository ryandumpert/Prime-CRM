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
    Users
} from 'lucide-react';
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

export default function ReportsPage() {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, []);

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

    const exportData = async (format: 'csv' | 'json') => {
        // In a real implementation, this would call an export API
        alert(`Export to ${format.toUpperCase()} - Feature coming soon`);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }

    // Calculate pipeline stats
    const pipelineStages = stats?.statusCounts ? Object.entries(stats.statusCounts)
        .filter(([status]) => !['CLOSED_FUNDED', 'NOT_INTERESTED', 'UNQUALIFIED', 'LOST', 'DO_NOT_CONTACT'].includes(status))
        .map(([status, count]) => ({ status: status as LeadStatusType, count }))
        : [];

    const maxCount = Math.max(...pipelineStages.map(s => s.count), 1);

    return (
        <>
            <Header
                title="Reports"
                subtitle="Pipeline analytics and team performance"
            />

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

            {/* Advisor Performance */}
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
