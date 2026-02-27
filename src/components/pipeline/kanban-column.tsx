'use client';

import { useDroppable, useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import { STATUS_LABELS, PIPELINE_COLORS, PipelineType, LeadStatusType } from '@/lib/constants';
import { KanbanCard, KanbanLead } from './kanban-card';

function DraggableCard({ lead, onCardClick, onCardContextMenu }: {
    lead: KanbanLead;
    onCardClick: (lead: KanbanLead) => void;
    onCardContextMenu?: (e: React.MouseEvent, lead: KanbanLead) => void;
}) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: lead.id,
    });

    const style = transform
        ? { transform: CSS.Translate.toString(transform) }
        : undefined;

    return (
        <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
            <KanbanCard lead={lead} onClick={onCardClick} onContextMenu={onCardContextMenu} isDragging={isDragging} />
        </div>
    );
}

interface KanbanColumnProps {
    status: LeadStatusType;
    leads: KanbanLead[];
    count: number;
    hasMore: boolean;
    pipeline: PipelineType;
    onCardClick: (lead: KanbanLead) => void;
    onCardContextMenu?: (e: React.MouseEvent, lead: KanbanLead) => void;
}

export function KanbanColumn({
    status,
    leads,
    count,
    hasMore,
    pipeline,
    onCardClick,
    onCardContextMenu,
}: KanbanColumnProps) {
    const { setNodeRef, isOver } = useDroppable({ id: status });
    const colors = PIPELINE_COLORS[pipeline];

    return (
        <div
            ref={setNodeRef}
            className={cn(
                'flex flex-col min-w-[280px] max-w-[320px] flex-1 rounded-xl border transition-all duration-200',
                'bg-[hsl(222,47%,8%)]',
                isOver
                    ? `border-2 ${colors.border} bg-[hsl(222,47%,10%)] shadow-lg`
                    : 'border-[hsl(222,47%,15%)]'
            )}
        >
            {/* Column Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[hsl(222,47%,15%)]">
                <div className="flex items-center gap-2">
                    <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: colors.accent }}
                    />
                    <h3 className="text-sm font-semibold text-gray-300">
                        {STATUS_LABELS[status]}
                    </h3>
                </div>
                <span className={cn(
                    'inline-flex items-center justify-center min-w-[24px] h-[24px] px-2 rounded-full text-xs font-bold',
                    colors.bg, colors.text
                )}>
                    {count}
                </span>
            </div>

            {/* Card List */}
            <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5 min-h-[200px] max-h-[calc(100vh-280px)]">
                {leads.length === 0 ? (
                    <div className={cn(
                        'flex items-center justify-center h-20 rounded-lg border-2 border-dashed text-sm text-gray-500',
                        isOver ? colors.border : 'border-[hsl(222,47%,15%)]'
                    )}>
                        {isOver ? 'Drop here' : 'No leads'}
                    </div>
                ) : (
                    leads.map((lead) => (
                        <DraggableCard
                            key={lead.id}
                            lead={lead}
                            onCardClick={onCardClick}
                            onCardContextMenu={onCardContextMenu}
                        />
                    ))
                )}
                {hasMore && (
                    <div className="text-center py-2">
                        <span className="text-xs text-gray-500">
                            + {count - leads.length} more leads
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}
