'use client';

import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors, DragOverlay, DragStartEvent } from '@dnd-kit/core';
import { useState } from 'react';
import { PIPELINE_STATUSES, PipelineType, LeadStatusType } from '@/lib/constants';
import { KanbanColumn } from './kanban-column';
import { KanbanCard, KanbanLead } from './kanban-card';

interface ColumnData {
    leads: KanbanLead[];
    count: number;
    hasMore: boolean;
}

interface KanbanBoardDesktopProps {
    pipeline: PipelineType;
    columns: Record<string, ColumnData>;
    onCardClick: (lead: KanbanLead) => void;
    onCardMove: (leadId: string, newStatus: LeadStatusType) => void;
}

export function KanbanBoardDesktop({
    pipeline,
    columns,
    onCardClick,
    onCardMove,
}: KanbanBoardDesktopProps) {
    const [activeLead, setActiveLead] = useState<KanbanLead | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8, // 8px of movement before drag starts (prevents accidental drags from clicks)
            },
        })
    );

    const statuses = PIPELINE_STATUSES[pipeline];

    const handleDragStart = (event: DragStartEvent) => {
        const leadId = event.active.id as string;
        // Find the lead across all columns
        for (const col of Object.values(columns)) {
            const found = col.leads.find((l) => l.id === leadId);
            if (found) {
                setActiveLead(found);
                break;
            }
        }
    };

    const handleDragEnd = (event: DragEndEvent) => {
        setActiveLead(null);
        const { active, over } = event;
        if (!over) return;

        const leadId = active.id as string;
        const targetStatus = over.id as LeadStatusType;

        // Find current status
        let currentStatus: string | null = null;
        for (const [status, col] of Object.entries(columns)) {
            if (col.leads.find((l) => l.id === leadId)) {
                currentStatus = status;
                break;
            }
        }

        // Only move if status actually changed
        if (currentStatus && currentStatus !== targetStatus) {
            onCardMove(leadId, targetStatus);
        }
    };

    return (
        <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div className="flex gap-4 overflow-x-auto pb-4 h-full">
                {statuses.map((status) => {
                    const col = columns[status] || { leads: [], count: 0, hasMore: false };
                    return (
                        <KanbanColumn
                            key={status}
                            status={status}
                            leads={col.leads}
                            count={col.count}
                            hasMore={col.hasMore}
                            pipeline={pipeline}
                            onCardClick={onCardClick}
                        />
                    );
                })}
            </div>

            {/* Drag overlay - shows a floating card when dragging */}
            <DragOverlay dropAnimation={null}>
                {activeLead ? (
                    <div className="w-[280px]">
                        <KanbanCard
                            lead={activeLead}
                            onClick={() => { }}
                            isDragging
                        />
                    </div>
                ) : null}
            </DragOverlay>
        </DndContext>
    );
}
