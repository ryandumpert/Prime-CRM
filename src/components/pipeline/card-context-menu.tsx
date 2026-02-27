'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import {
    PipelineType,
    PIPELINE_LABELS,
    PIPELINE_COLORS,
    PIPELINE_TRANSFERS,
    PIPELINES,
} from '@/lib/constants';
import { ArrowRightLeft, Snowflake, Flame, FileCheck } from 'lucide-react';

const PIPELINE_ICONS: Record<PipelineType, React.ReactNode> = {
    cold_leads: <Snowflake className="w-3.5 h-3.5" />,
    warm_leads: <Flame className="w-3.5 h-3.5" />,
    processing: <FileCheck className="w-3.5 h-3.5" />,
};

interface CardContextMenuProps {
    isOpen: boolean;
    position: { x: number; y: number };
    currentPipeline: PipelineType;
    leadId: string;
    onTransfer: (leadId: string, targetPipeline: PipelineType) => void;
    onClose: () => void;
}

export function CardContextMenu({
    isOpen,
    position,
    currentPipeline,
    leadId,
    onTransfer,
    onClose,
}: CardContextMenuProps) {
    const menuRef = useRef<HTMLDivElement>(null);

    // Adjust menu position to stay within viewport
    const [adjustedPos, setAdjustedPos] = useState(position);

    useEffect(() => {
        if (isOpen && menuRef.current) {
            const rect = menuRef.current.getBoundingClientRect();
            const viewportW = window.innerWidth;
            const viewportH = window.innerHeight;

            let x = position.x;
            let y = position.y;

            if (x + rect.width > viewportW - 8) {
                x = viewportW - rect.width - 8;
            }
            if (y + rect.height > viewportH - 8) {
                y = viewportH - rect.height - 8;
            }
            if (x < 8) x = 8;
            if (y < 8) y = 8;

            setAdjustedPos({ x, y });
        }
    }, [isOpen, position]);

    // Close on click outside
    useEffect(() => {
        if (!isOpen) return;
        const handler = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [isOpen, onClose]);

    // Close on Escape
    useEffect(() => {
        if (!isOpen) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const transferOptions = PIPELINE_TRANSFERS[currentPipeline];

    if (transferOptions.length === 0) return null;

    return (
        <div
            ref={menuRef}
            className={cn(
                'fixed z-[100] min-w-[220px] rounded-xl border border-[hsl(222,47%,20%)]',
                'bg-[hsl(222,47%,10%)] shadow-2xl shadow-black/40',
                'animate-in fade-in zoom-in-95 duration-150',
                'backdrop-blur-xl',
            )}
            style={{
                left: adjustedPos.x,
                top: adjustedPos.y,
            }}
        >
            {/* Header */}
            <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-[hsl(222,47%,15%)]">
                <ArrowRightLeft className="w-3.5 h-3.5 text-gray-500" />
                <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Move to Pipeline
                </span>
            </div>

            {/* Options */}
            <div className="p-1.5">
                {transferOptions.map((targetPipeline) => {
                    const colors = PIPELINE_COLORS[targetPipeline];
                    return (
                        <button
                            key={targetPipeline}
                            onClick={() => {
                                onTransfer(leadId, targetPipeline);
                                onClose();
                            }}
                            className={cn(
                                'flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-left',
                                'transition-all duration-150',
                                'hover:bg-[hsl(222,47%,15%)] active:bg-[hsl(222,47%,18%)]',
                                'group'
                            )}
                        >
                            <span className={cn(
                                'flex items-center justify-center w-7 h-7 rounded-lg',
                                colors.bg,
                                colors.text,
                            )}>
                                {PIPELINE_ICONS[targetPipeline]}
                            </span>
                            <div className="flex flex-col">
                                <span className="text-sm font-medium text-gray-200 group-hover:text-white transition-colors">
                                    {PIPELINE_LABELS[targetPipeline]}
                                </span>
                                <span className="text-[11px] text-gray-500">
                                    {targetPipeline === 'cold_leads' && 'Move to outreach list'}
                                    {targetPipeline === 'warm_leads' && 'Move to active cultivation'}
                                    {targetPipeline === 'processing' && 'Move to loan processing'}
                                </span>
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
