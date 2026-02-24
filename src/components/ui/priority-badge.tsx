'use client';

import { cn } from '@/lib/utils';
import { PRIORITY_LABELS, PRIORITY_COLORS, PriorityType } from '@/lib/constants';

interface PriorityBadgeProps {
    priority: PriorityType;
    className?: string;
}

export function PriorityBadge({ priority, className }: PriorityBadgeProps) {
    const colors = PRIORITY_COLORS[priority];
    const label = PRIORITY_LABELS[priority];

    return (
        <span
            className={cn(
                'inline-flex items-center px-2 py-0.5 text-xs font-medium rounded',
                colors.bg,
                colors.text,
                className
            )}
        >
            {label}
        </span>
    );
}
