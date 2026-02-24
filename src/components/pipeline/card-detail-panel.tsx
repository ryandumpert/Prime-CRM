'use client';

import { cn } from '@/lib/utils';
import { formatPhoneDisplay, formatDateTime, daysSinceContact } from '@/lib/utils';
import { StatusBadge, PriorityBadge, Button } from '@/components/ui';
import {
    X,
    Phone,
    MessageSquare,
    Mail,
    ArrowRight,
    ExternalLink,
    Clock,
    User,
} from 'lucide-react';
import {
    STATUS_LABELS,
    PIPELINE_LABELS,
    PIPELINE_COLORS,
    PIPELINE_STATUSES,
    PIPELINE_TRANSFERS,
    PIPELINE_ENTRY_STATUS,
    PipelineType,
    LeadStatusType,
} from '@/lib/constants';
import { KanbanLead } from './kanban-card';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';

interface CardDetailPanelProps {
    lead: KanbanLead | null;
    isOpen: boolean;
    onClose: () => void;
    onStatusChange: (leadId: string, newStatus: LeadStatusType) => void;
    onPipelineTransfer: (leadId: string, newPipeline: PipelineType) => void;
}

export function CardDetailPanel({
    lead,
    isOpen,
    onClose,
    onStatusChange,
    onPipelineTransfer,
}: CardDetailPanelProps) {
    const router = useRouter();
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Close on Escape key
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) {
            document.addEventListener('keydown', handleEsc);
            // Prevent body scroll on mobile
            if (isMobile) document.body.style.overflow = 'hidden';
        }
        return () => {
            document.removeEventListener('keydown', handleEsc);
            document.body.style.overflow = '';
        };
    }, [isOpen, isMobile, onClose]);

    if (!lead || !isOpen) return null;

    const displayName = lead.fullName || [lead.firstName, lead.lastName].filter(Boolean).join(' ') || 'Unknown';
    const pipeline = lead.pipeline as PipelineType;
    const status = lead.status as LeadStatusType;
    const colors = PIPELINE_COLORS[pipeline];
    const pipelineStatuses = PIPELINE_STATUSES[pipeline];
    const transferTargets = PIPELINE_TRANSFERS[pipeline];

    const getDaysText = () => {
        if (!lead.lastContactedAt) return 'Never contacted';
        const days = daysSinceContact(lead.lastContactedAt);
        if (days === 0) return 'Today';
        if (days === 1) return '1 day ago';
        return `${days} days ago`;
    };

    // ── Mobile: Bottom Sheet ──
    if (isMobile) {
        return (
            <>
                {/* Backdrop */}
                <div
                    className="fixed inset-0 bg-black/60 z-40 animate-in fade-in duration-200"
                    onClick={onClose}
                />

                {/* Bottom Sheet */}
                <div className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] flex flex-col bg-[hsl(222,47%,11%)] border-t border-[hsl(222,47%,20%)] rounded-t-2xl animate-in slide-in-from-bottom duration-300">
                    {/* Drag handle */}
                    <div className="flex justify-center pt-3 pb-1">
                        <div className="w-10 h-1 rounded-full bg-gray-600" />
                    </div>

                    {/* Header */}
                    <div className="flex items-start justify-between px-5 pt-2 pb-4">
                        <div>
                            <h3 className="text-lg font-bold text-gray-100">{displayName}</h3>
                            <div className="flex items-center gap-2 mt-1">
                                <span
                                    className="w-2 h-2 rounded-full"
                                    style={{ backgroundColor: colors.accent }}
                                />
                                <span className="text-sm text-gray-400">
                                    {PIPELINE_LABELS[pipeline]} · {STATUS_LABELS[status]}
                                </span>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg hover:bg-[hsl(222,47%,16%)] transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                        >
                            <X className="w-5 h-5 text-gray-400" />
                        </button>
                    </div>

                    {/* Scrollable content */}
                    <div className="flex-1 overflow-y-auto px-5 pb-6">
                        {/* Quick action buttons */}
                        <div className="flex gap-2 mb-5">
                            {lead.phonePrimary && (
                                <a
                                    href={`tel:${lead.phonePrimary}`}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-green-500/15 text-green-400 border border-green-500/25 font-medium text-sm min-h-[56px] transition-colors hover:bg-green-500/25"
                                >
                                    <Phone className="w-4.5 h-4.5" />
                                    <span>Call</span>
                                </a>
                            )}
                            {lead.phonePrimary && (
                                <a
                                    href={`sms:${lead.phonePrimary}`}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-blue-500/15 text-blue-400 border border-blue-500/25 font-medium text-sm min-h-[56px] transition-colors hover:bg-blue-500/25"
                                >
                                    <MessageSquare className="w-4.5 h-4.5" />
                                    <span>Text</span>
                                </a>
                            )}
                            {lead.emailPrimary && (
                                <a
                                    href={`mailto:${lead.emailPrimary}`}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-purple-500/15 text-purple-400 border border-purple-500/25 font-medium text-sm min-h-[56px] transition-colors hover:bg-purple-500/25"
                                >
                                    <Mail className="w-4.5 h-4.5" />
                                    <span>Email</span>
                                </a>
                            )}
                        </div>

                        {/* Contact info */}
                        <div className="space-y-2 mb-5">
                            {lead.phonePrimary && (
                                <div className="flex items-center gap-2 text-sm">
                                    <Phone className="w-3.5 h-3.5 text-gray-500" />
                                    <span className="text-gray-300">{formatPhoneDisplay(lead.phonePrimary)}</span>
                                </div>
                            )}
                            {lead.emailPrimary && (
                                <div className="flex items-center gap-2 text-sm">
                                    <Mail className="w-3.5 h-3.5 text-gray-500" />
                                    <span className="text-gray-300">{lead.emailPrimary}</span>
                                </div>
                            )}
                            <div className="flex items-center gap-2 text-sm">
                                <Clock className="w-3.5 h-3.5 text-gray-500" />
                                <span className="text-gray-300">Last contact: {getDaysText()}</span>
                            </div>
                            {lead.assignedAdvisor && (
                                <div className="flex items-center gap-2 text-sm">
                                    <User className="w-3.5 h-3.5 text-gray-500" />
                                    <span className="text-gray-300">{lead.assignedAdvisor.displayName}</span>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-3 mb-4">
                            <StatusBadge status={status} />
                            <PriorityBadge priority={lead.priority} />
                        </div>

                        {/* Move to status */}
                        <div className="mb-5">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Move to Status</p>
                            <div className="flex flex-wrap gap-2">
                                {pipelineStatuses
                                    .filter((s) => s !== status)
                                    .map((targetStatus) => (
                                        <button
                                            key={targetStatus}
                                            onClick={() => onStatusChange(lead.id, targetStatus)}
                                            className="px-3.5 py-2.5 rounded-lg bg-[hsl(222,47%,14%)] text-gray-300 text-sm font-medium border border-[hsl(222,47%,20%)] hover:bg-[hsl(222,47%,18%)] hover:text-white transition-colors min-h-[44px]"
                                        >
                                            {STATUS_LABELS[targetStatus]}
                                        </button>
                                    ))}
                            </div>
                        </div>

                        {/* Move to pipeline */}
                        {transferTargets.length > 0 && (
                            <div className="mb-5">
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Move to Pipeline</p>
                                <div className="flex flex-col gap-2">
                                    {transferTargets.map((targetPipeline) => {
                                        const tColors = PIPELINE_COLORS[targetPipeline];
                                        return (
                                            <button
                                                key={targetPipeline}
                                                onClick={() => onPipelineTransfer(lead.id, targetPipeline)}
                                                className={cn(
                                                    'flex items-center justify-between px-4 py-3.5 rounded-xl border transition-colors min-h-[48px]',
                                                    tColors.border,
                                                    'bg-[hsl(222,47%,14%)] hover:bg-[hsl(222,47%,18%)]'
                                                )}
                                            >
                                                <div className="flex items-center gap-2.5">
                                                    <span
                                                        className="w-2.5 h-2.5 rounded-full"
                                                        style={{ backgroundColor: tColors.accent }}
                                                    />
                                                    <span className={cn('font-medium text-sm', tColors.text)}>
                                                        {PIPELINE_LABELS[targetPipeline]}
                                                    </span>
                                                </div>
                                                <ArrowRight className={cn('w-4 h-4', tColors.text)} />
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* View full details */}
                        <button
                            onClick={() => {
                                onClose();
                                router.push(`/leads/${lead.id}`);
                            }}
                            className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl bg-[hsl(222,47%,14%)] text-gray-300 text-sm font-medium border border-[hsl(222,47%,20%)] hover:bg-[hsl(222,47%,18%)] hover:text-white transition-colors min-h-[48px]"
                        >
                            <ExternalLink className="w-4 h-4" />
                            <span>View Full Details</span>
                        </button>
                    </div>
                </div>
            </>
        );
    }

    // ── Desktop: Slide-out Panel ──
    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/30 z-40 animate-in fade-in duration-200"
                onClick={onClose}
            />

            {/* Panel */}
            <div className="fixed top-0 right-0 bottom-0 w-[420px] z-50 bg-[hsl(222,47%,11%)] border-l border-[hsl(222,47%,18%)] shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col">
                {/* Header */}
                <div className="flex items-start justify-between p-6 border-b border-[hsl(222,47%,15%)]">
                    <div>
                        <h3 className="text-xl font-bold text-gray-100">{displayName}</h3>
                        <div className="flex items-center gap-2 mt-1.5">
                            <span
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: colors.accent }}
                            />
                            <span className="text-sm text-gray-400">
                                {PIPELINE_LABELS[pipeline]} · {STATUS_LABELS[status]}
                            </span>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg hover:bg-[hsl(222,47%,16%)] transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                {/* Scrollable content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Contact info */}
                    <div className="space-y-3">
                        {lead.phonePrimary && (
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-sm">
                                    <Phone className="w-4 h-4 text-gray-500" />
                                    <span className="text-gray-300">{formatPhoneDisplay(lead.phonePrimary)}</span>
                                </div>
                                <div className="flex gap-1.5">
                                    <a
                                        href={`tel:${lead.phonePrimary}`}
                                        className="px-3 py-1.5 rounded-lg bg-green-500/15 text-green-400 text-xs font-medium hover:bg-green-500/25 transition-colors"
                                    >
                                        Call
                                    </a>
                                    <a
                                        href={`sms:${lead.phonePrimary}`}
                                        className="px-3 py-1.5 rounded-lg bg-blue-500/15 text-blue-400 text-xs font-medium hover:bg-blue-500/25 transition-colors"
                                    >
                                        Text
                                    </a>
                                </div>
                            </div>
                        )}
                        {lead.emailPrimary && (
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-sm">
                                    <Mail className="w-4 h-4 text-gray-500" />
                                    <span className="text-gray-300">{lead.emailPrimary}</span>
                                </div>
                                <a
                                    href={`mailto:${lead.emailPrimary}`}
                                    className="px-3 py-1.5 rounded-lg bg-purple-500/15 text-purple-400 text-xs font-medium hover:bg-purple-500/25 transition-colors"
                                >
                                    Email
                                </a>
                            </div>
                        )}
                        <div className="flex items-center gap-2 text-sm">
                            <Clock className="w-4 h-4 text-gray-500" />
                            <span className="text-gray-300">Last contact: {getDaysText()}</span>
                        </div>
                        {lead.assignedAdvisor && (
                            <div className="flex items-center gap-2 text-sm">
                                <User className="w-4 h-4 text-gray-500" />
                                <span className="text-gray-300">{lead.assignedAdvisor.displayName}</span>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-3">
                        <StatusBadge status={status} />
                        <PriorityBadge priority={lead.priority} />
                    </div>

                    {/* Status change */}
                    <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2.5">Change Status</p>
                        <div className="flex flex-wrap gap-2">
                            {pipelineStatuses
                                .filter((s) => s !== status)
                                .map((targetStatus) => (
                                    <button
                                        key={targetStatus}
                                        onClick={() => onStatusChange(lead.id, targetStatus)}
                                        className="px-3 py-2 rounded-lg bg-[hsl(222,47%,14%)] text-gray-300 text-sm font-medium border border-[hsl(222,47%,20%)] hover:bg-[hsl(222,47%,18%)] hover:text-white transition-colors"
                                    >
                                        {STATUS_LABELS[targetStatus]}
                                    </button>
                                ))}
                        </div>
                    </div>

                    {/* Pipeline transfer */}
                    {transferTargets.length > 0 && (
                        <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2.5">Transfer Pipeline</p>
                            <div className="flex flex-col gap-2">
                                {transferTargets.map((targetPipeline) => {
                                    const tColors = PIPELINE_COLORS[targetPipeline];
                                    return (
                                        <button
                                            key={targetPipeline}
                                            onClick={() => onPipelineTransfer(lead.id, targetPipeline)}
                                            className={cn(
                                                'flex items-center justify-between px-4 py-3 rounded-xl border transition-colors',
                                                tColors.border,
                                                'bg-[hsl(222,47%,14%)] hover:bg-[hsl(222,47%,18%)]'
                                            )}
                                        >
                                            <div className="flex items-center gap-2.5">
                                                <span
                                                    className="w-2.5 h-2.5 rounded-full"
                                                    style={{ backgroundColor: tColors.accent }}
                                                />
                                                <span className={cn('font-medium text-sm', tColors.text)}>
                                                    {PIPELINE_LABELS[targetPipeline]}
                                                </span>
                                            </div>
                                            <ArrowRight className={cn('w-4 h-4', tColors.text)} />
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-[hsl(222,47%,15%)]">
                    <button
                        onClick={() => {
                            onClose();
                            router.push(`/leads/${lead.id}`);
                        }}
                        className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl bg-blue-500/15 text-blue-400 text-sm font-medium border border-blue-500/25 hover:bg-blue-500/25 transition-colors"
                    >
                        <ExternalLink className="w-4 h-4" />
                        <span>View Full Details</span>
                    </button>
                </div>
            </div>
        </>
    );
}
