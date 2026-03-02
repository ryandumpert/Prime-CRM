'use client';

import { cn } from '@/lib/utils';
import { formatPhoneDisplay, daysSinceContact, formatDateTime } from '@/lib/utils';
import { PriorityBadge } from '@/components/ui';
import { Phone, Clock, FileText, Calendar, MapPin } from 'lucide-react';

export interface KanbanLead {
    id: string;
    firstName: string | null;
    lastName: string | null;
    fullName: string | null;
    phonePrimary: string | null;
    emailPrimary: string | null;
    status: string;
    priority: 'low' | 'normal' | 'high';
    lastContactedAt: string | null;
    statusUpdatedAt: string | null;
    pipeline: string;
    latestNote: string | null;
    nextActionAt: string | null;
    dateOfEntry: string | null;
    leadSource: string | null;
    assignedAdvisor: { id: string; displayName: string } | null;
}

interface KanbanCardProps {
    lead: KanbanLead;
    onClick: (lead: KanbanLead) => void;
    onContextMenu?: (e: React.MouseEvent, lead: KanbanLead) => void;
    isDragging?: boolean;
    className?: string;
}

export function KanbanCard({ lead, onClick, onContextMenu, isDragging, className }: KanbanCardProps) {
    const displayName = (lead.firstName && lead.lastName)
        ? `${lead.firstName} ${lead.lastName}`
        : lead.fullName || lead.firstName || lead.lastName || 'Unknown';

    const getDaysText = () => {
        if (!lead.lastContactedAt) return 'Never contacted';
        const days = daysSinceContact(lead.lastContactedAt);
        if (days === 0) return 'Today';
        if (days === 1) return '1 day ago';
        return `${days} days ago`;
    };

    return (
        <div
            onClick={() => onClick(lead)}
            onContextMenu={(e) => {
                if (onContextMenu) {
                    e.preventDefault();
                    onContextMenu(e, lead);
                }
            }}
            className={cn(
                'group glass-card p-6 cursor-pointer transition-all duration-200',
                'hover:border-[hsl(222,47%,28%)] hover:bg-[hsl(222,47%,12%)]',
                'active:scale-[0.98] active:bg-[hsl(222,47%,14%)]',
                'min-h-[72px]', // Touch target minimum
                isDragging && 'opacity-50 scale-105 shadow-2xl rotate-1',
                className
            )}
            style={{ borderRadius: '12px' }}
        >
            {/* Name + Date of Entry */}
            <div className="flex items-center justify-between mb-2.5">
                <h4 className="font-semibold text-[15px] text-white truncate pr-2">
                    {displayName}
                </h4>
                {lead.dateOfEntry && (
                    <span className="text-[11px] text-gray-400 truncate flex-shrink-0 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(lead.dateOfEntry).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                )}
            </div>

            {/* Phone (display only — call/text actions are in the detail panel) */}
            {lead.phonePrimary && (
                <div className="flex items-center gap-1.5 text-[13px] text-gray-200 mb-2.5">
                    <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{formatPhoneDisplay(lead.phonePrimary)}</span>
                </div>
            )}

            {/* Latest note preview */}
            {lead.latestNote && (
                <div className="flex items-start gap-1.5 text-[12px] text-gray-300 mb-2.5">
                    <FileText className="w-3 h-3 flex-shrink-0 mt-0.5" />
                    <span className="line-clamp-1 italic">{lead.latestNote}</span>
                </div>
            )}

            {/* Priority + Lead Source */}
            <div className="flex items-center justify-between gap-2">
                <PriorityBadge priority={lead.priority} className="text-[11px] px-1.5 py-0" />
                {lead.leadSource ? (
                    <div className="flex items-center gap-1 text-[12px] text-gray-300">
                        <MapPin className="w-3 h-3" />
                        <span className="truncate max-w-[80px]">{lead.leadSource}</span>
                    </div>
                ) : (
                    <div className="flex items-center gap-1 text-[12px] text-gray-300">
                        <Clock className="w-3 h-3" />
                        <span>{getDaysText()}</span>
                    </div>
                )}
            </div>
        </div>
    );
}
