'use client';

import { useState, useEffect } from 'react';
import { PipelineType, LeadStatusType } from '@/lib/constants';
import { KanbanBoardDesktop } from './kanban-board-desktop';
import { KanbanBoardMobile } from './kanban-board-mobile';
import { KanbanLead } from './kanban-card';

interface ColumnData {
    leads: KanbanLead[];
    count: number;
    hasMore: boolean;
}

interface KanbanBoardProps {
    pipeline: PipelineType;
    columns: Record<string, ColumnData>;
    onCardClick: (lead: KanbanLead) => void;
    onCardMove: (leadId: string, newStatus: LeadStatusType) => void;
    onPipelineTransfer?: (leadId: string, targetPipeline: PipelineType) => void;
    onSnooze?: (leadId: string, days: number) => void;
    isLoading?: boolean;
}

export function KanbanBoard({
    pipeline,
    columns,
    onCardClick,
    onCardMove,
    onPipelineTransfer,
    onSnooze,
    isLoading,
}: KanbanBoardProps) {
    const [isMobile, setIsMobile] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    if (!mounted) {
        // SSR placeholder to avoid hydration mismatch
        return (
            <div className="flex items-center justify-center py-16">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (isMobile) {
        return (
            <KanbanBoardMobile
                pipeline={pipeline}
                columns={columns}
                onCardClick={onCardClick}
                onSnooze={onSnooze}
                onPipelineTransfer={onPipelineTransfer}
                isLoading={isLoading}
            />
        );
    }

    return (
        <KanbanBoardDesktop
            pipeline={pipeline}
            columns={columns}
            onCardClick={onCardClick}
            onCardMove={onCardMove}
            onSnooze={onSnooze}
            onPipelineTransfer={onPipelineTransfer}
        />
    );
}
