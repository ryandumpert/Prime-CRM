'use client';

import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors, DragOverlay, DragStartEvent } from '@dnd-kit/core';
import { useState, useCallback } from 'react';
import { PIPELINE_STATUSES, PipelineType, LeadStatusType } from '@/lib/constants';
import { KanbanColumn } from './kanban-column';
import { KanbanCard, KanbanLead } from './kanban-card';
import { CardContextMenu } from './card-context-menu';

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
    onSnooze?: (leadId: string, days: number) => void;
    onPipelineTransfer?: (leadId: string, targetPipeline: PipelineType) => void;
}

export function KanbanBoardDesktop({
    pipeline,
    columns,
    onCardClick,
    onCardMove,
    onSnooze,
    onPipelineTransfer,
}: KanbanBoardDesktopProps) {
    const [activeLead, setActiveLead] = useState<KanbanLead | null>(null);

    // Context menu state
    const [contextMenu, setContextMenu] = useState<{
        isOpen: boolean;
        position: { x: number; y: number };
        leadId: string;
    }>({
        isOpen: false,
        position: { x: 0, y: 0 },
        leadId: '',
    });

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

    const handleCardContextMenu = useCallback((e: React.MouseEvent, lead: KanbanLead) => {
        e.preventDefault();
        setContextMenu({
            isOpen: true,
            position: { x: e.clientX, y: e.clientY },
            leadId: lead.id,
        });
    }, []);

    const handleContextMenuClose = useCallback(() => {
        setContextMenu((prev) => ({ ...prev, isOpen: false }));
    }, []);

    const handleContextMenuTransfer = useCallback((leadId: string, targetPipeline: PipelineType) => {
        if (onPipelineTransfer) {
            onPipelineTransfer(leadId, targetPipeline);
        }
    }, [onPipelineTransfer]);

    return (
        <>
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
                                onSnooze={onSnooze}
                                onCardContextMenu={handleCardContextMenu}
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

            {/* Context menu for pipeline transfers */}
            <CardContextMenu
                isOpen={contextMenu.isOpen}
                position={contextMenu.position}
                currentPipeline={pipeline}
                leadId={contextMenu.leadId}
                onTransfer={handleContextMenuTransfer}
                onClose={handleContextMenuClose}
            />
        </>
    );
}
