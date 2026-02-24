'use client';

import { cn } from '@/lib/utils';
import { STATUS_LABELS, STATUS_COLORS, LeadStatusType } from '@/lib/constants';

interface StatusBadgeProps {
    status: LeadStatusType;
    className?: string;
    size?: 'sm' | 'md';
}

export function StatusBadge({ status, className, size = 'md' }: StatusBadgeProps) {
    const colors = STATUS_COLORS[status];
    const label = STATUS_LABELS[status];

    return (
        <span
            className={cn(
                'badge',
                colors.bg,
                colors.text,
                colors.border,
                size === 'sm' && 'text-xs px-2 py-0.5',
                className
            )}
        >
            {label}
        </span>
    );
}
