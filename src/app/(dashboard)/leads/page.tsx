'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout';
import { Button, Input, Select, Card, StatusBadge, PriorityBadge } from '@/components/ui';
import {
    Search,
    Filter,
    Plus,
    Phone,
    Mail,
    MessageSquare,
    ChevronLeft,
    ChevronRight,
    Loader2,
    Users,
    RefreshCw,
    Archive,
    CheckSquare,
    Square
} from 'lucide-react';
import Link from 'next/link';
import { formatPhoneDisplay, formatDateTime, daysSinceContact } from '@/lib/utils';
import { LEAD_STATUSES, STATUS_LABELS, LeadStatusType, PriorityType } from '@/lib/constants';

interface Lead {
    id: string;
    firstName: string | null;
    lastName: string | null;
    fullName: string | null;
    phonePrimary: string | null;
    emailPrimary: string | null;
    status: LeadStatusType;
    priority: PriorityType;
    lastContactedAt: string | null;
    nextActionAt: string | null;
    assignedAdvisor: { id: string; displayName: string } | null;
    doNotCall: boolean;
    doNotText: boolean;
    doNotEmail: boolean;
}

interface LeadsResponse {
    data: Lead[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

export default function LeadsPage() {
    const { data: session } = useSession();
    const router = useRouter();
    const [leads, setLeads] = useState<Lead[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [priorityFilter, setPriorityFilter] = useState('');
    const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
    const [isArchiving, setIsArchiving] = useState(false);

    const isAdmin = session?.user?.role === 'admin';
    const pageSize = 20;

    const fetchLeads = useCallback(async () => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                pageSize: pageSize.toString(),
            });

            if (search) params.append('search', search);
            if (statusFilter) params.append('status', statusFilter);
            if (priorityFilter) params.append('priority', priorityFilter);

            const res = await fetch(`/api/leads?${params}`);
            const data: LeadsResponse = await res.json();

            setLeads(data.data || []);
            setTotal(data.total || 0);
            setTotalPages(data.totalPages || 1);
        } catch (error) {
            console.error('Error fetching leads:', error);
        } finally {
            setIsLoading(false);
        }
    }, [page, search, statusFilter, priorityFilter]);

    useEffect(() => {
        fetchLeads();
    }, [fetchLeads]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(1);
        setSelectedLeads(new Set());
        fetchLeads();
    };

    const getDisplayName = (lead: Lead) => {
        if (lead.fullName) return lead.fullName;
        if (lead.firstName || lead.lastName) {
            return `${lead.firstName || ''} ${lead.lastName || ''}`.trim();
        }
        return 'Unknown';
    };

    const getDaysText = (lastContactedAt: string | null) => {
        if (!lastContactedAt) return 'Never contacted';
        const days = daysSinceContact(lastContactedAt);
        if (days === 0) return 'Today';
        if (days === 1) return '1 day ago';
        return `${days} days ago`;
    };

    const handleArchive = async (leadId: string) => {
        if (!confirm('Are you sure you want to archive this lead? It will be hidden from all views.')) return;
        try {
            await fetch(`/api/leads/${leadId}/archive`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ archived: true }),
            });
            fetchLeads();
        } catch (error) {
            console.error('Error archiving lead:', error);
        }
    };

    const handleBatchArchive = async () => {
        if (selectedLeads.size === 0) return;
        if (!confirm(`Are you sure you want to archive ${selectedLeads.size} lead(s)? They will be hidden from all views.`)) return;
        setIsArchiving(true);
        try {
            await Promise.all(
                Array.from(selectedLeads).map(leadId =>
                    fetch(`/api/leads/${leadId}/archive`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ archived: true }),
                    })
                )
            );
            setSelectedLeads(new Set());
            fetchLeads();
        } catch (error) {
            console.error('Error batch archiving leads:', error);
        } finally {
            setIsArchiving(false);
        }
    };

    const toggleSelectLead = (leadId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedLeads(prev => {
            const next = new Set(prev);
            if (next.has(leadId)) {
                next.delete(leadId);
            } else {
                next.add(leadId);
            }
            return next;
        });
    };

    const toggleSelectAll = () => {
        if (selectedLeads.size === leads.length) {
            setSelectedLeads(new Set());
        } else {
            setSelectedLeads(new Set(leads.map(l => l.id)));
        }
    };

    return (
        <>
            <Header
                title={isAdmin ? 'All Leads' : 'My Leads'}
                subtitle={`${total} total leads`}
            />

            {/* Filters */}
            <Card className="mb-6">
                <div className="flex flex-col md:flex-row flex-wrap gap-3 md:gap-4">
                    <form onSubmit={handleSearch} className="flex-1 min-w-0 md:min-w-[200px]">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                            <input
                                type="text"
                                placeholder="Search by name, email, or phone..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="input pl-10"
                            />
                        </div>
                    </form>

                    <div className="flex gap-3 flex-wrap">
                        <Select
                            options={[
                                { value: '', label: 'All Statuses' },
                                ...LEAD_STATUSES.map(s => ({ value: s, label: STATUS_LABELS[s] })),
                            ]}
                            value={statusFilter}
                            onChange={(e) => {
                                setStatusFilter(e.target.value);
                                setPage(1);
                            }}
                            className="w-full md:w-48"
                        />

                        <Select
                            options={[
                                { value: '', label: 'All Priorities' },
                                { value: 'high', label: 'High' },
                                { value: 'normal', label: 'Normal' },
                                { value: 'low', label: 'Low' },
                            ]}
                            value={priorityFilter}
                            onChange={(e) => {
                                setPriorityFilter(e.target.value);
                                setPage(1);
                            }}
                            className="w-full md:w-40"
                        />
                    </div>

                    <div className="flex gap-3 flex-wrap">
                        <Button variant="secondary" onClick={fetchLeads}>
                            <RefreshCw className="w-4 h-4" />
                            Refresh
                        </Button>

                        {isAdmin && selectedLeads.size > 0 && (
                            <Button variant="danger" onClick={handleBatchArchive} isLoading={isArchiving}>
                                <Archive className="w-4 h-4" />
                                Archive ({selectedLeads.size})
                            </Button>
                        )}

                        {isAdmin && (
                            <Link href="/leads/new">
                                <Button>
                                    <Plus className="w-4 h-4" />
                                    Add Lead
                                </Button>
                            </Link>
                        )}
                    </div>
                </div>
            </Card>

            {/* Leads Table */}
            <Card className="p-0">
                {isLoading ? (
                    <div className="flex items-center justify-center py-16">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                    </div>
                ) : leads.length === 0 ? (
                    <div className="empty-state py-16">
                        <Users className="empty-state-icon" />
                        <h3 className="empty-state-title">No leads found</h3>
                        <p className="empty-state-description">
                            {search || statusFilter || priorityFilter
                                ? 'Try adjusting your filters'
                                : isAdmin
                                    ? 'Import leads or add them manually to get started'
                                    : 'No leads have been assigned to you yet'}
                        </p>
                        {isAdmin && !search && !statusFilter && !priorityFilter && (
                            <Link href="/import" className="mt-4">
                                <Button>Import Leads</Button>
                            </Link>
                        )}
                    </div>
                ) : (
                    <>
                        {/* ── Desktop Table View (hidden on mobile) ── */}
                        <div className="table-container hidden md:block">
                            <table className="table">
                                <thead>
                                    <tr>
                                        {isAdmin && (
                                            <th className="w-10">
                                                <button onClick={toggleSelectAll} className="p-1 hover:text-blue-400 transition-colors">
                                                    {selectedLeads.size === leads.length && leads.length > 0
                                                        ? <CheckSquare className="w-4 h-4 text-blue-400" />
                                                        : <Square className="w-4 h-4" />}
                                                </button>
                                            </th>
                                        )}
                                        <th>Lead</th>
                                        <th>Contact</th>
                                        <th>Status</th>
                                        <th>Priority</th>
                                        <th>Last Contact</th>
                                        {isAdmin && <th>Advisor</th>}
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {leads.map((lead) => (
                                        <tr
                                            key={lead.id}
                                            className="cursor-pointer hover:bg-[hsl(222,47%,14%)]"
                                            onClick={() => router.push(`/leads/${lead.id}`)}
                                        >
                                            {isAdmin && (
                                                <td onClick={(e) => e.stopPropagation()}>
                                                    <button onClick={(e) => toggleSelectLead(lead.id, e)} className="p-1 hover:text-blue-400 transition-colors">
                                                        {selectedLeads.has(lead.id)
                                                            ? <CheckSquare className="w-4 h-4 text-blue-400" />
                                                            : <Square className="w-4 h-4 text-gray-600" />}
                                                    </button>
                                                </td>
                                            )}
                                            <td>
                                                <div className="font-medium">{getDisplayName(lead)}</div>
                                            </td>
                                            <td>
                                                <div className="text-sm">
                                                    {lead.phonePrimary && (
                                                        <div className="text-gray-300">{formatPhoneDisplay(lead.phonePrimary)}</div>
                                                    )}
                                                    {lead.emailPrimary && (
                                                        <div className="text-gray-500 truncate max-w-[200px]">{lead.emailPrimary}</div>
                                                    )}
                                                </div>
                                            </td>
                                            <td>
                                                <StatusBadge status={lead.status} size="sm" />
                                            </td>
                                            <td>
                                                <PriorityBadge priority={lead.priority} />
                                            </td>
                                            <td>
                                                <span className={`text-sm ${!lead.lastContactedAt || daysSinceContact(lead.lastContactedAt)! >= 5 ? 'text-orange-400' : 'text-gray-400'}`}>
                                                    {getDaysText(lead.lastContactedAt)}
                                                </span>
                                            </td>
                                            {isAdmin && (
                                                <td className="text-gray-400 text-sm">
                                                    {lead.assignedAdvisor?.displayName || 'Unassigned'}
                                                </td>
                                            )}
                                            <td onClick={(e) => e.stopPropagation()}>
                                                <div className="action-row">
                                                    {lead.phonePrimary && (
                                                        <button
                                                            className={`quick-action call ${lead.doNotCall ? 'disabled' : ''}`}
                                                            title={lead.doNotCall ? 'Do Not Call' : 'Call'}
                                                            onClick={() => !lead.doNotCall && router.push(`/leads/${lead.id}?action=call`)}
                                                        >
                                                            <Phone className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    {lead.emailPrimary && (
                                                        <button
                                                            className={`quick-action email ${lead.doNotEmail ? 'disabled' : ''}`}
                                                            title={lead.doNotEmail ? 'Do Not Email' : 'Email'}
                                                            onClick={() => !lead.doNotEmail && router.push(`/leads/${lead.id}?action=email`)}
                                                        >
                                                            <Mail className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    {lead.phonePrimary && (
                                                        <button
                                                            className={`quick-action text ${lead.doNotText ? 'disabled' : ''}`}
                                                            title={lead.doNotText ? 'Do Not Text' : 'Text'}
                                                            onClick={() => !lead.doNotText && router.push(`/leads/${lead.id}?action=text`)}
                                                        >
                                                            <MessageSquare className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    {isAdmin && (
                                                        <button
                                                            onClick={() => handleArchive(lead.id)}
                                                            className="quick-action text-gray-500 hover:text-orange-400 transition-colors"
                                                            title="Archive Lead"
                                                        >
                                                            <Archive className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* ── Mobile Card View (hidden on desktop) ── */}
                        <div className="md:hidden divide-y divide-[hsl(222,47%,15%)]">
                            {leads.map((lead) => (
                                <div
                                    key={lead.id}
                                    className="p-5 active:bg-[hsl(222,47%,14%)] transition-colors cursor-pointer"
                                    onClick={() => router.push(`/leads/${lead.id}`)}
                                >
                                    <div className="flex items-start justify-between mb-2">
                                        <div className="flex items-center gap-2 min-w-0">
                                            {isAdmin && (
                                                <button
                                                    onClick={(e) => toggleSelectLead(lead.id, e)}
                                                    className="p-0.5 shrink-0"
                                                >
                                                    {selectedLeads.has(lead.id)
                                                        ? <CheckSquare className="w-4 h-4 text-blue-400" />
                                                        : <Square className="w-4 h-4 text-gray-600" />}
                                                </button>
                                            )}
                                            <p className="font-medium text-white truncate">{getDisplayName(lead)}</p>
                                        </div>
                                        <StatusBadge status={lead.status} size="sm" />
                                    </div>

                                    <div className="flex items-center gap-3 text-sm text-gray-400 mb-2">
                                        {lead.phonePrimary && (
                                            <span>{formatPhoneDisplay(lead.phonePrimary)}</span>
                                        )}
                                        <PriorityBadge priority={lead.priority} />
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <span className={`text-xs ${!lead.lastContactedAt || daysSinceContact(lead.lastContactedAt)! >= 5 ? 'text-orange-400' : 'text-gray-500'}`}>
                                            {getDaysText(lead.lastContactedAt)}
                                            {isAdmin && lead.assignedAdvisor && (
                                                <span className="text-gray-600"> · {lead.assignedAdvisor.displayName}</span>
                                            )}
                                        </span>
                                        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                                            {lead.phonePrimary && (
                                                <button
                                                    className={`quick-action call ${lead.doNotCall ? 'disabled' : ''}`}
                                                    onClick={() => !lead.doNotCall && router.push(`/leads/${lead.id}?action=call`)}
                                                >
                                                    <Phone className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                            {lead.emailPrimary && (
                                                <button
                                                    className={`quick-action email ${lead.doNotEmail ? 'disabled' : ''}`}
                                                    onClick={() => !lead.doNotEmail && router.push(`/leads/${lead.id}?action=email`)}
                                                >
                                                    <Mail className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                            {lead.phonePrimary && (
                                                <button
                                                    className={`quick-action text ${lead.doNotText ? 'disabled' : ''}`}
                                                    onClick={() => !lead.doNotText && router.push(`/leads/${lead.id}?action=text`)}
                                                >
                                                    <MessageSquare className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Pagination */}
                        <div className="flex items-center justify-between p-4 md:p-5 border-t border-[hsl(222,47%,15%)]">
                            <p className="text-xs md:text-sm text-gray-500">
                                <span className="hidden md:inline">Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, total)} of {total} leads</span>
                                <span className="md:hidden">{total} leads</span>
                            </p>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    disabled={page === 1}
                                    onClick={() => setPage(p => p - 1)}
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                    <span className="hidden md:inline">Previous</span>
                                </Button>
                                <span className="text-xs md:text-sm text-gray-400 px-1 md:px-2">
                                    {page} / {totalPages}
                                </span>
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    disabled={page >= totalPages}
                                    onClick={() => setPage(p => p + 1)}
                                >
                                    <span className="hidden md:inline">Next</span>
                                    <ChevronRight className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    </>
                )}
            </Card>
        </>
    );
}
