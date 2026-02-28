'use client';

import { cn } from '@/lib/utils';
import { STATUS_LABELS, PIPELINE_COLORS, PipelineType, LeadStatusType } from '@/lib/constants';

interface ColumnTabsProps {
    statuses: LeadStatusType[];
    activeStatus: LeadStatusType;
    onSelect: (status: LeadStatusType) => void;
    counts: Record<string, number>;
    pipeline: PipelineType;
}

export function ColumnTabs({ statuses, activeStatus, onSelect, counts, pipeline }: ColumnTabsProps) {
    const colors = PIPELINE_COLORS[pipeline];

    return (
        <div className="flex overflow-x-auto gap-1.5 px-1 py-2 scrollbar-hide -mx-1">
            {statuses.map((status) => {
                const isActive = status === activeStatus;
                const count = counts[status] || 0;

                return (
                    <button
                        key={status}
                        onClick={() => onSelect(status)}
                        className={cn(
                            'flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-200 flex-shrink-0',
                            'min-h-[44px]', // Touch target
                            isActive
                                ? `${colors.bg} ${colors.text} ${colors.border} border`
                                : 'text-gray-300 hover:text-gray-200 hover:bg-[hsl(222,47%,14%)] border border-transparent'
                        )}
                    >
                        <span>{STATUS_LABELS[status]}</span>
                        <span
                            className={cn(
                                'inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full text-xs font-semibold',
                                isActive
                                    ? 'bg-white/15 text-inherit'
                                    : 'bg-[hsl(222,47%,18%)] text-gray-300'
                            )}
                        >
                            {count}
                        </span>
                    </button>
                );
            })}
        </div>
    );
}
