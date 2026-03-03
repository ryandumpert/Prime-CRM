'use client';

import { useEffect, useState, useCallback } from 'react';
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
import { Loader2 } from 'lucide-react';

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

    return (
        <div className="flex flex-col h-full">
            <Header
                title="Pipeline Board"
                subtitle={`${PIPELINE_LABELS[pipeline]} · ${totalLeads} leads`}
            />

            <div className="flex-1 flex flex-col overflow-hidden p-3 md:p-6">
                {/* Pipeline selector */}
                <div className="mb-4 md:mb-5">
                    <PipelineSelector value={pipeline} onChange={handlePipelineChange} />
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
                            columns={columns}
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
