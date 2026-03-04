'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { formatPhoneDisplay, daysSinceContact } from '@/lib/utils';
import { PriorityBadge } from '@/components/ui';
import { Phone, Clock, FileText, Calendar, MapPin, Mail, MessageSquare, Zap, Timer, SkipForward, AlertTriangle, PhoneOutgoing } from 'lucide-react';

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
    loanProduct: string | null;
    leadScore: number;
    interactionCount: number;
    callAttemptCount: number;
    lastCallAttemptAt: string | null;
    assignedAdvisor: { id: string; displayName: string } | null;
}

interface KanbanCardProps {
    lead: KanbanLead;
    onClick: (lead: KanbanLead) => void;
    onSnooze?: (leadId: string, days: number) => void;
    onContextMenu?: (e: React.MouseEvent, lead: KanbanLead) => void;
    isDragging?: boolean;
    className?: string;
}

function getScoreColor(score: number): string {
    if (score >= 70) return 'text-green-400 bg-green-500/15 border-green-500/30';
    if (score >= 40) return 'text-yellow-400 bg-yellow-500/15 border-yellow-500/30';
    return 'text-gray-400 bg-gray-500/15 border-gray-500/30';
}

function getScoreLabel(score: number): string {
    if (score >= 70) return 'Hot';
    if (score >= 40) return 'Warm';
    return 'Cold';
}

export function KanbanCard({ lead, onClick, onSnooze, onContextMenu, isDragging, className }: KanbanCardProps) {
    const [showSnooze, setShowSnooze] = useState(false);

    const displayName = (lead.firstName && lead.lastName)
        ? `${lead.firstName} ${lead.lastName}`
        : lead.fullName || lead.firstName || lead.lastName || 'Unknown';

    // Stale lead detection
    const daysSinceLastContact: number = lead.lastContactedAt
        ? (daysSinceContact(lead.lastContactedAt) ?? 999)
        : lead.dateOfEntry
            ? (daysSinceContact(lead.dateOfEntry) ?? 999)
            : 999;

    const staleLevel: 'critical' | 'warning' | 'caution' | null =
        daysSinceLastContact >= 14 ? 'critical' :
            daysSinceLastContact >= 7 ? 'warning' :
                daysSinceLastContact >= 3 ? 'caution' :
                    null;

    const staleBorderClass =
        staleLevel === 'critical' ? 'ring-2 ring-red-500/60 border-red-500/40' :
            staleLevel === 'warning' ? 'ring-2 ring-orange-500/50 border-orange-500/30' :
                staleLevel === 'caution' ? 'ring-1 ring-amber-500/40 border-amber-500/25' :
                    '';

    const staleGlowClass =
        staleLevel === 'critical' ? 'shadow-[0_0_12px_rgba(239,68,68,0.25)]' :
            staleLevel === 'warning' ? 'shadow-[0_0_8px_rgba(249,115,22,0.2)]' :
                '';

    const getDaysText = () => {
        if (!lead.lastContactedAt) return 'Never contacted';
        const days = daysSinceContact(lead.lastContactedAt);
        if (days === 0) return 'Today';
        if (days === 1) return '1 day ago';
        return `${days} days ago`;
    };

    const handleSnooze = (e: React.MouseEvent, days: number) => {
        e.stopPropagation();
        onSnooze?.(lead.id, days);
        setShowSnooze(false);
    };

    const handleQuickAction = (e: React.MouseEvent) => {
        e.stopPropagation();
    };

    const score = lead.leadScore ?? 0;

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
                'group glass-card p-5 cursor-pointer transition-all duration-200',
                'hover:border-[hsl(222,47%,28%)] hover:bg-[hsl(222,47%,12%)]',
                'active:scale-[0.98] active:bg-[hsl(222,47%,14%)]',
                'min-h-[72px]',
                isDragging && 'opacity-50 scale-105 shadow-2xl rotate-1',
                staleBorderClass,
                staleGlowClass,
                className
            )}
            style={{ borderRadius: '12px' }}
        >
            {/* Row 1: Name + Badge (Cold Leads: attempt count, Others: lead score) */}
            <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-[15px] text-white truncate pr-2">
                    {displayName}
                </h4>
                {lead.pipeline === 'cold_leads' ? (
                    <span className={cn(
                        'text-[10px] font-bold px-2 py-0.5 rounded-full border flex-shrink-0 flex items-center gap-1',
                        lead.callAttemptCount === 0
                            ? 'text-gray-400 bg-gray-500/15 border-gray-500/30'
                            : lead.callAttemptCount <= 2
                                ? 'text-orange-400 bg-orange-500/15 border-orange-500/30'
                                : 'text-red-400 bg-red-500/15 border-red-500/30'
                    )}>
                        <PhoneOutgoing className="w-2.5 h-2.5" />
                        {lead.callAttemptCount}
                    </span>
                ) : (
                    <span className={cn(
                        'text-[10px] font-bold px-2 py-0.5 rounded-full border flex-shrink-0 flex items-center gap-1',
                        getScoreColor(score)
                    )}>
                        <Zap className="w-2.5 h-2.5" />
                        {score}
                    </span>
                )}
            </div>

            {/* Row 2: Phone + Quick Actions (call/text mobile-only, email always) */}
            {lead.phonePrimary && (
                <div className="flex items-center justify-between gap-1.5 mb-2">
                    <div className="flex items-center gap-1.5 text-[13px] text-gray-200">
                        <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>{formatPhoneDisplay(lead.phonePrimary)}</span>
                    </div>
                    {/* Quick actions — appear on hover (desktop) or always (mobile) */}
                    <div className="flex items-center gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                        {/* Call — mobile only (nobody calls from desktop) */}
                        <a
                            href={`tel:${lead.phonePrimary}`}
                            onClick={handleQuickAction}
                            className="md:hidden p-1.5 rounded-md bg-green-500/15 text-green-400 hover:bg-green-500/25 transition-colors"
                            title="Call"
                        >
                            <Phone className="w-3.5 h-3.5" />
                        </a>
                        {/* Text — mobile only */}
                        <a
                            href={`sms:${lead.phonePrimary}`}
                            onClick={handleQuickAction}
                            className="md:hidden p-1.5 rounded-md bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 transition-colors"
                            title="Text"
                        >
                            <MessageSquare className="w-3.5 h-3.5" />
                        </a>
                        {/* Email — desktop + mobile */}
                        {lead.emailPrimary && (
                            <a
                                href={`mailto:${lead.emailPrimary}`}
                                onClick={handleQuickAction}
                                className="p-1.5 rounded-md bg-purple-500/15 text-purple-400 hover:bg-purple-500/25 transition-colors"
                                title="Email"
                            >
                                <Mail className="w-3.5 h-3.5" />
                            </a>
                        )}
                    </div>
                </div>
            )}

            {/* Row 3: Latest note preview */}
            {lead.latestNote && (
                <div className="flex items-start gap-1.5 text-[12px] text-gray-300 mb-2">
                    <FileText className="w-3 h-3 flex-shrink-0 mt-0.5" />
                    <span className="line-clamp-1 italic">{lead.latestNote}</span>
                </div>
            )}

            {/* Row 4: Call attempts + Date of entry + Lead Source */}
            <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                    {lead.callAttemptCount > 0 && (
                        <span className={cn(
                            'text-[11px] font-medium px-1.5 py-0.5 rounded-md flex items-center gap-1',
                            lead.callAttemptCount >= 5
                                ? 'bg-red-500/15 text-red-400 border border-red-500/25'
                                : lead.callAttemptCount >= 3
                                    ? 'bg-orange-500/15 text-orange-400 border border-orange-500/25'
                                    : 'bg-blue-500/15 text-blue-400 border border-blue-500/25'
                        )}>
                            <PhoneOutgoing className="w-3 h-3" />
                            ×{lead.callAttemptCount}
                        </span>
                    )}
                    {lead.dateOfEntry && (
                        <span className="text-[11px] text-gray-400 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(lead.dateOfEntry).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                    )}
                </div>
                {lead.leadSource ? (
                    <div className="flex items-center gap-1 text-[11px] text-gray-400">
                        <MapPin className="w-3 h-3" />
                        <span className="truncate max-w-[80px]">{lead.leadSource}</span>
                    </div>
                ) : !lead.dateOfEntry && (
                    <div className="flex items-center gap-1 text-[11px] text-gray-400">
                        <Clock className="w-3 h-3" />
                        <span>{getDaysText()}</span>
                    </div>
                )}
            </div>

            {/* Row 5: Priority + Snooze */}
            <div className="flex items-center justify-between gap-2">
                <PriorityBadge priority={lead.priority} className="text-[11px] px-1.5 py-0" />

                {/* Snooze button */}
                <div className="relative">
                    {showSnooze ? (
                        <div className="flex items-center gap-1 animate-in fade-in duration-150">
                            <button
                                onClick={(e) => handleSnooze(e, 1)}
                                className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 transition-colors whitespace-nowrap"
                                title="Snooze 1 day"
                            >
                                1d
                            </button>
                            <button
                                onClick={(e) => handleSnooze(e, 3)}
                                className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 transition-colors whitespace-nowrap"
                                title="Snooze 3 days"
                            >
                                3d
                            </button>
                            <button
                                onClick={(e) => handleSnooze(e, 7)}
                                className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 transition-colors whitespace-nowrap"
                                title="Snooze 1 week"
                            >
                                1w
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); setShowSnooze(false); }}
                                className="text-[10px] px-1 py-0.5 rounded text-gray-500 hover:text-gray-300 transition-colors"
                            >
                                ✕
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={(e) => { e.stopPropagation(); setShowSnooze(true); }}
                            className="flex items-center gap-1 text-[11px] text-gray-500 hover:text-blue-400 transition-colors opacity-0 group-hover:opacity-100 md:opacity-0 md:group-hover:opacity-100"
                            title="Snooze follow-up"
                        >
                            <Timer className="w-3 h-3" />
                            <span className="hidden md:inline">Snooze</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Follow-up reminder bar */}
            {lead.nextActionAt && (
                <div className="mt-2 pt-2 border-t border-gray-700/50 flex items-center gap-1.5 text-[11px]">
                    <SkipForward className="w-3 h-3 text-orange-400" />
                    <span className="text-orange-300">
                        Follow up: {new Date(lead.nextActionAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                </div>
            )}

            {/* Stale lead warning */}
            {staleLevel && (
                <div className={cn(
                    'mt-2 pt-2 border-t flex items-center gap-1.5 text-[11px]',
                    staleLevel === 'critical' ? 'border-red-500/30' :
                        staleLevel === 'warning' ? 'border-orange-500/20' :
                            'border-amber-500/15'
                )}>
                    <AlertTriangle className={cn(
                        'w-3 h-3 flex-shrink-0',
                        staleLevel === 'critical' ? 'text-red-400 animate-pulse' :
                            staleLevel === 'warning' ? 'text-orange-400' :
                                'text-amber-400'
                    )} />
                    <span className={cn(
                        staleLevel === 'critical' ? 'text-red-300' :
                            staleLevel === 'warning' ? 'text-orange-300' :
                                'text-amber-300'
                    )}>
                        {daysSinceLastContact >= 14 ? `${daysSinceLastContact}d — Needs urgent attention` :
                            daysSinceLastContact >= 7 ? `${daysSinceLastContact}d — Going cold` :
                                `${daysSinceLastContact}d since contact`}
                    </span>
                </div>
            )}
        </div>
    );
}
