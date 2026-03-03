'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { Header } from '@/components/layout';
import { PipelineSelector } from '@/components/pipeline/pipeline-selector';
import { KanbanBoard } from '@/components/pipeline/kanban-board';
import { CardDetailPanel } from '@/components/pipeline/card-detail-panel';
import { KanbanLead } from '@/components/pipeline/kanban-card';
import {
    PipelineType,
    LeadStatusType,
    PIPELINE_LABELS,
    PIPELINE_STATUSES,
    PIPELINE_ENTRY_STATUS,
} from '@/lib/constants';
import { Loader2, AlertTriangle, Filter, X, Package } from 'lucide-react';
import { daysSinceContact } from '@/lib/utils';

interface ColumnData {
    leads: KanbanLead[];
    count: number;
    hasMore: boolean;
}

export default function PipelinePage() {
    const [pipeline, setPipeline] = useState<PipelineType>('cold_leads');
    const [columns, setColumns] = useState<Record<string, ColumnData>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [selectedLead, setSelectedLead] = useState<KanbanLead | null>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [showStaleOnly, setShowStaleOnly] = useState(false);
    const [loanProductFilter, setLoanProductFilter] = useState<string>('');

    const fetchKanbanData = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`/api/leads/kanban?pipeline=${pipeline}&limit=100`);
            const data = await res.json();
            if (data.columns) {
                setColumns(data.columns);
            }
        } catch (error) {
            console.error('Error fetching kanban data:', error);
        } finally {
            setIsLoading(false);
        }
    }, [pipeline]);

    useEffect(() => {
        fetchKanbanData();
    }, [fetchKanbanData]);

    const handlePipelineChange = (newPipeline: PipelineType) => {
        setPipeline(newPipeline);
        setSelectedLead(null);
        setIsDetailOpen(false);
    };

    const handleCardClick = (lead: KanbanLead) => {
        setSelectedLead(lead);
        setIsDetailOpen(true);
    };

    const handleCardMove = async (leadId: string, newStatus: LeadStatusType) => {
        // AUTO-TRANSFER: When a card in cold_leads is moved to CONTACTED,
        // automatically transfer it to the warm_leads pipeline.
        if (pipeline === 'cold_leads' && newStatus === 'CONTACTED') {
            await handlePipelineTransfer(leadId, 'warm_leads');
            return;
        }

        // Optimistic update: move card in local state immediately
        setColumns((prev) => {
            const updated = { ...prev };
            let movedLead: KanbanLead | null = null;
            let oldStatus: string | null = null;

            // Remove from current column
            for (const [status, col] of Object.entries(updated)) {
                const idx = col.leads.findIndex((l) => l.id === leadId);
                if (idx !== -1) {
                    movedLead = { ...col.leads[idx], status: newStatus };
                    oldStatus = status;
                    updated[status] = {
                        ...col,
                        leads: col.leads.filter((l) => l.id !== leadId),
                        count: col.count - 1,
                    };
                    break;
                }
            }

            // Add to new column
            if (movedLead && updated[newStatus]) {
                updated[newStatus] = {
                    ...updated[newStatus],
                    leads: [movedLead, ...updated[newStatus].leads],
                    count: updated[newStatus].count + 1,
                };
            }

            return updated;
        });

        // API call
        try {
            const res = await fetch(`/api/leads/${leadId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus }),
            });

            if (!res.ok) {
                // Revert on failure
                console.error('Failed to move card');
                fetchKanbanData();
            }
        } catch (error) {
            console.error('Error moving card:', error);
            fetchKanbanData();
        }
    };

    const handleStatusChange = async (leadId: string, newStatus: LeadStatusType) => {
        // Same as card move but from the detail panel
        await handleCardMove(leadId, newStatus);

        // Update selected lead if it's the one being changed
        if (selectedLead?.id === leadId) {
            setSelectedLead((prev) => prev ? { ...prev, status: newStatus } : null);
        }
    };

    const handlePipelineTransfer = async (leadId: string, newPipeline: PipelineType) => {
        // Optimistic update: remove from current board
        setColumns((prev) => {
            const updated = { ...prev };
            for (const [status, col] of Object.entries(updated)) {
                const idx = col.leads.findIndex((l) => l.id === leadId);
                if (idx !== -1) {
                    updated[status] = {
                        ...col,
                        leads: col.leads.filter((l) => l.id !== leadId),
                        count: col.count - 1,
                    };
                    break;
                }
            }
            return updated;
        });

        // Close detail panel
        setIsDetailOpen(false);
        setSelectedLead(null);

        // API call — send both pipeline and status (entry status for the target pipeline)
        try {
            const entryStatus = PIPELINE_ENTRY_STATUS[newPipeline];
            const res = await fetch(`/api/leads/${leadId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pipeline: newPipeline, status: entryStatus }),
            });

            if (!res.ok) {
                console.error('Failed to transfer pipeline');
                fetchKanbanData();
            }
        } catch (error) {
            console.error('Error transferring pipeline:', error);
            fetchKanbanData();
        }
    };

    const handleSnooze = async (leadId: string, days: number) => {
        const nextDate = new Date();
        nextDate.setDate(nextDate.getDate() + days);
        nextDate.setHours(9, 0, 0, 0); // Set to 9 AM

        // Optimistic update: update nextActionAt on the card
        setColumns((prev) => {
            const updated = { ...prev };
            for (const [status, col] of Object.entries(updated)) {
                const idx = col.leads.findIndex((l) => l.id === leadId);
                if (idx !== -1) {
                    const updatedLeads = [...col.leads];
                    updatedLeads[idx] = { ...updatedLeads[idx], nextActionAt: nextDate.toISOString() };
                    updated[status] = { ...col, leads: updatedLeads };
                    break;
                }
            }
            return updated;
        });

        // API call
        try {
            await fetch(`/api/leads/${leadId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nextActionAt: nextDate.toISOString() }),
            });
        } catch (error) {
            console.error('Error snoozing lead:', error);
            fetchKanbanData();
        }
    };

    // Calculate total leads across all columns
    const totalLeads = Object.values(columns).reduce((sum, col) => sum + col.count, 0);

    // Collect all unique loan products for the filter dropdown
    const loanProducts = useMemo(() => {
        const products = new Set<string>();
        Object.values(columns).forEach(col => {
            col.leads.forEach(lead => {
                if (lead.loanProduct) products.add(lead.loanProduct);
            });
        });
        return Array.from(products).sort();
    }, [columns]);

    // Count stale leads (3+ days without contact)
    const staleCount = useMemo(() => {
        let count = 0;
        Object.values(columns).forEach(col => {
            col.leads.forEach(lead => {
                const days = lead.lastContactedAt
                    ? (daysSinceContact(lead.lastContactedAt) ?? 999)
                    : lead.dateOfEntry
                        ? (daysSinceContact(lead.dateOfEntry) ?? 999)
                        : 999;
                if (days >= 3) count++;
            });
        });
        return count;
    }, [columns]);

    // Apply client-side filters to columns
    const filteredColumns = useMemo(() => {
        if (!showStaleOnly && !loanProductFilter) return columns;

        const filtered: Record<string, { leads: KanbanLead[]; count: number; hasMore: boolean }> = {};
        for (const [status, col] of Object.entries(columns)) {
            let leads = col.leads;

            if (showStaleOnly) {
                leads = leads.filter(lead => {
                    const days = lead.lastContactedAt
                        ? (daysSinceContact(lead.lastContactedAt) ?? 999)
                        : lead.dateOfEntry
                            ? (daysSinceContact(lead.dateOfEntry) ?? 999)
                            : 999;
                    return days >= 3;
                });
            }

            if (loanProductFilter) {
                leads = leads.filter(lead => lead.loanProduct === loanProductFilter);
            }

            filtered[status] = {
                leads,
                count: leads.length,
                hasMore: false,
            };
        }
        return filtered;
    }, [columns, showStaleOnly, loanProductFilter]);

    const filteredTotal = Object.values(filteredColumns).reduce((sum, col) => sum + col.count, 0);
    const activeFilterCount = (showStaleOnly ? 1 : 0) + (loanProductFilter ? 1 : 0);

    return (
        <div className="flex flex-col h-full">
            <Header
                title="Pipeline Board"
                subtitle={`${PIPELINE_LABELS[pipeline]} · ${totalLeads} leads`}
            />

            <div className="flex-1 flex flex-col overflow-hidden p-3 md:p-6">
                {/* Pipeline selector + Filters */}
                <div className="mb-4 md:mb-5 space-y-3">
                    <div className="flex flex-col md:flex-row md:items-center gap-3">
                        <PipelineSelector value={pipeline} onChange={handlePipelineChange} />

                        {/* Filter bar */}
                        <div className="flex items-center gap-2 flex-wrap">
                            {/* Needs Attention toggle */}
                            <button
                                onClick={() => setShowStaleOnly(!showStaleOnly)}
                                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 border ${showStaleOnly
                                        ? 'bg-red-500/15 border-red-500/40 text-red-300 shadow-[0_0_8px_rgba(239,68,68,0.15)]'
                                        : 'bg-[hsl(222,47%,11%)] border-[hsl(222,47%,18%)] text-gray-400 hover:text-gray-200 hover:border-[hsl(222,47%,25%)]'
                                    }`}
                            >
                                <AlertTriangle className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Needs Attention</span>
                                {staleCount > 0 && (
                                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${showStaleOnly
                                            ? 'bg-red-500/25 text-red-200'
                                            : 'bg-orange-500/20 text-orange-300'
                                        }`}>
                                        {staleCount}
                                    </span>
                                )}
                            </button>

                            {/* Loan Product filter */}
                            {loanProducts.length > 0 && (
                                <div className="relative">
                                    <select
                                        value={loanProductFilter}
                                        onChange={(e) => setLoanProductFilter(e.target.value)}
                                        className={`appearance-none pl-8 pr-8 py-2 rounded-lg text-sm font-medium transition-all duration-200 border cursor-pointer ${loanProductFilter
                                                ? 'bg-blue-500/15 border-blue-500/40 text-blue-300'
                                                : 'bg-[hsl(222,47%,11%)] border-[hsl(222,47%,18%)] text-gray-400 hover:text-gray-200 hover:border-[hsl(222,47%,25%)]'
                                            }`}
                                    >
                                        <option value="">All Products</option>
                                        {loanProducts.map(product => (
                                            <option key={product} value={product}>{product}</option>
                                        ))}
                                    </select>
                                    <Package className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none text-gray-400" />
                                </div>
                            )}

                            {/* Clear filters */}
                            {activeFilterCount > 0 && (
                                <button
                                    onClick={() => { setShowStaleOnly(false); setLoanProductFilter(''); }}
                                    className="flex items-center gap-1 px-2 py-2 rounded-lg text-xs text-gray-400 hover:text-gray-200 transition-colors"
                                >
                                    <X className="w-3.5 h-3.5" />
                                    Clear
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Filter summary */}
                    {activeFilterCount > 0 && (
                        <div className="text-xs text-gray-400 flex items-center gap-1.5">
                            <Filter className="w-3 h-3" />
                            Showing {filteredTotal} of {totalLeads} leads
                            {showStaleOnly && <span className="text-red-300">· Needs attention</span>}
                            {loanProductFilter && <span className="text-blue-300">· {loanProductFilter}</span>}
                        </div>
                    )}
                </div>

                {/* Board */}
                {isLoading ? (
                    <div className="flex-1 flex items-center justify-center">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                    </div>
                ) : (
                    <div className="flex-1 overflow-hidden">
                        <KanbanBoard
                            pipeline={pipeline}
                            columns={filteredColumns}
                            onCardClick={handleCardClick}
                            onCardMove={handleCardMove}
                            onPipelineTransfer={handlePipelineTransfer}
                            onSnooze={handleSnooze}
                            isLoading={isLoading}
                        />
                    </div>
                )}
            </div>

            {/* Card detail panel (bottom sheet on mobile, slide-out on desktop) */}
            <CardDetailPanel
                lead={selectedLead}
                isOpen={isDetailOpen}
                onClose={() => {
                    setIsDetailOpen(false);
                    setSelectedLead(null);
                }}
                onStatusChange={handleStatusChange}
                onPipelineTransfer={handlePipelineTransfer}
            />
        </div>
    );
}
