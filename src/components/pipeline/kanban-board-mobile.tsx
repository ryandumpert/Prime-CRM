'use client';

import { useState } from 'react';
import { PIPELINE_STATUSES, PipelineType, LeadStatusType } from '@/lib/constants';
import { ColumnTabs } from './column-tabs';
import { KanbanCard, KanbanLead } from './kanban-card';
import { Loader2 } from 'lucide-react';

interface ColumnData {
    leads: KanbanLead[];
    count: number;
    hasMore: boolean;
}

interface KanbanBoardMobileProps {
    pipeline: PipelineType;
    columns: Record<string, ColumnData>;
    onCardClick: (lead: KanbanLead) => void;
    isLoading?: boolean;
}

export function KanbanBoardMobile({
    pipeline,
    columns,
    onCardClick,
    isLoading,
}: KanbanBoardMobileProps) {
    const statuses = PIPELINE_STATUSES[pipeline];
    const [activeTab, setActiveTab] = useState<LeadStatusType>(statuses[0]);

    // Ensure active tab is valid for this pipeline
    const currentTab = statuses.includes(activeTab) ? activeTab : statuses[0];

    const counts: Record<string, number> = {};
    for (const status of statuses) {
        counts[status] = columns[status]?.count || 0;
    }

    const currentColumn = columns[currentTab] || { leads: [], count: 0, hasMore: false };

    return (
        <div className="flex flex-col h-full">
            {/* Tab bar */}
            <div className="sticky top-0 z-10 bg-[hsl(222,47%,7%)] border-b border-[hsl(222,47%,15%)] px-3 pb-1">
                <ColumnTabs
                    statuses={statuses}
                    activeStatus={currentTab}
                    onSelect={setActiveTab}
                    counts={counts}
                    pipeline={pipeline}
                />
            </div>

            {/* Card list */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
                {isLoading ? (
                    <div className="flex items-center justify-center py-16">
                        <Loader2 className="w-7 h-7 animate-spin text-blue-500" />
                    </div>
                ) : currentColumn.leads.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                        <p className="text-sm">No leads in this column</p>
                    </div>
                ) : (
                    <>
                        {currentColumn.leads.map((lead) => (
                            <KanbanCard
                                key={lead.id}
                                lead={lead}
                                onClick={onCardClick}
                            />
                        ))}
                        {currentColumn.hasMore && (
                            <div className="text-center py-3">
                                <span className="text-xs text-gray-500">
                                    Showing {currentColumn.leads.length} of {currentColumn.count} leads
                                </span>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
