'use client';

import { cn } from '@/lib/utils';
import { formatPhoneDisplay, formatDateTime, daysSinceContact } from '@/lib/utils';
import { StatusBadge, PriorityBadge, Button, DateTimePicker } from '@/components/ui';
import {
    X,
    Phone,
    MessageSquare,
    Mail,
    ArrowRight,
    ExternalLink,
    Clock,
    User,
    FileText,
    CalendarDays,
    Check,
    PhoneOutgoing,
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
import { NoteInput } from '@/components/notes/note-input';
import { NotesFeed } from '@/components/notes/notes-feed';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import { QuickCallModal } from '@/components/calls/quick-call-modal';

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
    const [noteRefreshKey, setNoteRefreshKey] = useState(0);
    const [nextActionDateISO, setNextActionDateISO] = useState('');
    const [isSavingDate, setIsSavingDate] = useState(false);
    const [dateSaved, setDateSaved] = useState(false);
    const [showCallModal, setShowCallModal] = useState(false);

    // Sync nextActionDateISO state with lead data when lead changes
    useEffect(() => {
        if (lead?.nextActionAt) {
            setNextActionDateISO(new Date(lead.nextActionAt).toISOString());
        } else {
            setNextActionDateISO('');
        }
        setDateSaved(false);
    }, [lead?.id, lead?.nextActionAt]);

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

    const handleSaveNextAction = async (isoValue: string) => {
        if (!lead) return;
        setNextActionDateISO(isoValue);
        setIsSavingDate(true);
        setDateSaved(false);
        try {
            await fetch(`/api/leads/${lead.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nextActionAt: isoValue || null,
                }),
            });
            setDateSaved(true);
            setTimeout(() => setDateSaved(false), 2000);
        } catch (error) {
            console.error('Error saving next action date:', error);
        } finally {
            setIsSavingDate(false);
        }
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
                <div className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] flex flex-col bg-[hsl(222,47%,11%)] border-t border-[hsl(222,47%,25%)] rounded-t-2xl animate-in slide-in-from-bottom duration-300">
                    {/* Drag handle */}
                    <div className="flex justify-center pt-3 pb-1">
                        <div className="w-10 h-1 rounded-full bg-gray-600" />
                    </div>

                    {/* Header */}
                    <div className="flex items-start justify-between px-6 pt-3 pb-5">
                        <div>
                            <h3 className="text-lg font-bold text-white">{displayName}</h3>
                            <div className="flex items-center gap-2 mt-1.5">
                                <span
                                    className="w-2 h-2 rounded-full"
                                    style={{ backgroundColor: colors.accent }}
                                />
                                <span className="text-sm text-gray-200">
                                    {PIPELINE_LABELS[pipeline]} · {STATUS_LABELS[status]}
                                </span>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg hover:bg-[hsl(222,47%,16%)] transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                        >
                            <X className="w-5 h-5 text-gray-200" />
                        </button>
                    </div>

                    {/* Scrollable content */}
                    <div className="flex-1 overflow-y-auto px-6 pb-6">
                        {/* Quick action buttons */}
                        <div className="flex gap-2 mb-5">
                            {lead.phonePrimary && (
                                <a
                                    href={`tel:${lead.phonePrimary}`}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-green-500/15 text-green-400 border border-green-500/30 font-medium text-sm min-h-[56px] transition-colors hover:bg-green-500/25"
                                >
                                    <Phone className="w-4.5 h-4.5" />
                                    <span>Call</span>
                                </a>
                            )}
                            {lead.phonePrimary && (
                                <a
                                    href={`sms:${lead.phonePrimary}`}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-blue-500/15 text-blue-400 border border-blue-500/30 font-medium text-sm min-h-[56px] transition-colors hover:bg-blue-500/25"
                                >
                                    <MessageSquare className="w-4.5 h-4.5" />
                                    <span>Text</span>
                                </a>
                            )}
                            {lead.emailPrimary && (
                                <a
                                    href={`mailto:${lead.emailPrimary}`}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-purple-500/15 text-purple-400 border border-purple-500/30 font-medium text-sm min-h-[56px] transition-colors hover:bg-purple-500/25"
                                >
                                    <Mail className="w-4.5 h-4.5" />
                                    <span>Email</span>
                                </a>
                            )}
                        </div>

                        {/* Log Call button - mobile */}
                        {lead.phonePrimary && (
                            <button
                                onClick={() => setShowCallModal(true)}
                                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-orange-500/15 text-orange-400 border border-orange-500/30 font-medium text-sm min-h-[48px] transition-colors hover:bg-orange-500/25 mb-5"
                            >
                                <PhoneOutgoing className="w-4 h-4" />
                                <span>Log Call Attempt</span>
                                {lead.callAttemptCount > 0 && (
                                    <span className="text-xs px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-300">#{lead.callAttemptCount + 1}</span>
                                )}
                            </button>
                        )}

                        {/* Contact info */}
                        <div className="space-y-3 mb-5">
                            {lead.phonePrimary && (
                                <div className="flex items-center gap-2.5 text-sm">
                                    <Phone className="w-3.5 h-3.5 text-gray-300" />
                                    <span className="text-gray-200">{formatPhoneDisplay(lead.phonePrimary)}</span>
                                </div>
                            )}
                            {lead.emailPrimary && (
                                <div className="flex items-center gap-2.5 text-sm">
                                    <Mail className="w-3.5 h-3.5 text-gray-300" />
                                    <span className="text-gray-200">{lead.emailPrimary}</span>
                                </div>
                            )}
                            <div className="flex items-center gap-2.5 text-sm">
                                <Clock className="w-3.5 h-3.5 text-gray-300" />
                                <span className="text-gray-200">Last contact: {getDaysText()}</span>
                            </div>
                            {lead.callAttemptCount > 0 && (
                                <div className="flex items-center gap-2.5 text-sm">
                                    <PhoneOutgoing className="w-3.5 h-3.5 text-gray-300" />
                                    <span className="text-gray-200">
                                        {lead.callAttemptCount} call attempt{lead.callAttemptCount !== 1 ? 's' : ''}
                                        {lead.lastCallAttemptAt && (
                                            <span className="text-gray-400 ml-1">
                                                · last {new Date(lead.lastCallAttemptAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                            </span>
                                        )}
                                    </span>
                                </div>
                            )}
                            {lead.assignedAdvisor && (
                                <div className="flex items-center gap-2.5 text-sm">
                                    <User className="w-3.5 h-3.5 text-gray-300" />
                                    <span className="text-gray-200">{lead.assignedAdvisor.displayName}</span>
                                </div>
                            )}
                            {/* Next Action Date */}
                            <div className="pt-3 border-t border-[hsl(222,47%,22%)]">
                                <div className="flex items-center gap-2 mb-2.5">
                                    <CalendarDays className="w-3.5 h-3.5 text-gray-300" />
                                    <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Follow-up Date</span>
                                    {dateSaved && <Check className="w-3 h-3 text-green-400" />}
                                </div>
                                <DateTimePicker
                                    value={nextActionDateISO}
                                    onChange={handleSaveNextAction}
                                    compact
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-3 mb-4">
                            <StatusBadge status={status} />
                            <PriorityBadge priority={lead.priority} />
                        </div>

                        {/* Notes Section */}
                        <div className="mb-5">
                            <div className="flex items-center gap-2 mb-3">
                                <FileText className="w-4 h-4 text-gray-300" />
                                <p className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Notes</p>
                            </div>
                            <NotesFeed
                                leadId={lead.id}
                                limit={3}
                                compact
                                refreshKey={noteRefreshKey}
                            />
                            <div className="mt-3">
                                <NoteInput
                                    leadId={lead.id}
                                    compact
                                    onNoteSaved={() => setNoteRefreshKey(k => k + 1)}
                                />
                            </div>
                        </div>

                        {/* Move to status */}
                        <div className="mb-5">
                            <p className="text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2.5">Move to Status</p>
                            <div className="flex flex-wrap gap-2">
                                {pipelineStatuses
                                    .filter((s) => s !== status)
                                    .map((targetStatus) => (
                                        <button
                                            key={targetStatus}
                                            onClick={() => onStatusChange(lead.id, targetStatus)}
                                            className="px-3.5 py-2.5 rounded-lg bg-[hsl(222,47%,14%)] text-gray-200 text-sm font-medium border border-[hsl(222,47%,24%)] hover:bg-[hsl(222,47%,18%)] hover:text-white transition-colors min-h-[44px]"
                                        >
                                            {STATUS_LABELS[targetStatus]}
                                        </button>
                                    ))}
                            </div>
                        </div>

                        {/* Move to pipeline */}
                        {transferTargets.length > 0 && (
                            <div className="mb-5">
                                <p className="text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2.5">Move to Pipeline</p>
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
                            className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl bg-[hsl(222,47%,14%)] text-gray-200 text-sm font-medium border border-[hsl(222,47%,20%)] hover:bg-[hsl(222,47%,18%)] hover:text-white transition-colors min-h-[48px]"
                        >
                            <ExternalLink className="w-4 h-4" />
                            <span>View Full Details</span>
                        </button>
                    </div>
                </div>

                <QuickCallModal
                    isOpen={showCallModal}
                    onClose={() => setShowCallModal(false)}
                    leadId={lead.id}
                    leadName={displayName}
                    callAttemptCount={lead.callAttemptCount}
                    onSuccess={() => {
                        setShowCallModal(false);
                        setNoteRefreshKey(k => k + 1);
                    }}
                />
            </>
        );
    }

    // Wrap with call modal for both mobile and desktop

    // ── Desktop: Slide-out Panel ──
    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/30 z-40 animate-in fade-in duration-200"
                onClick={onClose}
            />

            {/* Panel */}
            <div className="fixed top-0 right-0 bottom-0 w-[420px] z-50 bg-[hsl(222,47%,11%)] border-l border-[hsl(222,47%,24%)] shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col">
                {/* Header */}
                <div className="flex items-start justify-between p-7 border-b border-[hsl(222,47%,22%)]">
                    <div>
                        <h3 className="text-xl font-bold text-white">{displayName}</h3>
                        <div className="flex items-center gap-2 mt-2">
                            <span
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: colors.accent }}
                            />
                            <span className="text-sm text-gray-200">
                                {PIPELINE_LABELS[pipeline]} · {STATUS_LABELS[status]}
                            </span>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg hover:bg-[hsl(222,47%,16%)] transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-200" />
                    </button>
                </div>

                {/* Scrollable content */}
                <div className="flex-1 overflow-y-auto p-7 space-y-7">
                    {/* Contact info */}
                    <div className="space-y-3.5">
                        {lead.phonePrimary && (
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2.5 text-sm">
                                    <Phone className="w-4 h-4 text-gray-300" />
                                    <span className="text-gray-200">{formatPhoneDisplay(lead.phonePrimary)}</span>
                                </div>
                                <div className="flex gap-2">
                                    <a
                                        href={`tel:${lead.phonePrimary}`}
                                        className="px-3.5 py-1.5 rounded-lg bg-green-500/15 text-green-400 text-xs font-semibold hover:bg-green-500/25 transition-colors border border-green-500/20"
                                    >
                                        Call
                                    </a>
                                    <a
                                        href={`sms:${lead.phonePrimary}`}
                                        className="px-3.5 py-1.5 rounded-lg bg-blue-500/15 text-blue-400 text-xs font-semibold hover:bg-blue-500/25 transition-colors border border-blue-500/20"
                                    >
                                        Text
                                    </a>
                                </div>
                            </div>
                        )}

                        {/* Log Call button - desktop */}
                        {lead.phonePrimary && (
                            <button
                                onClick={() => setShowCallModal(true)}
                                className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-lg bg-orange-500/15 text-orange-400 text-sm font-semibold hover:bg-orange-500/25 transition-colors border border-orange-500/20"
                            >
                                <PhoneOutgoing className="w-4 h-4" />
                                Log Call
                                {lead.callAttemptCount > 0 && (
                                    <span className="text-xs px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-300">#{lead.callAttemptCount + 1}</span>
                                )}
                            </button>
                        )}
                        {lead.emailPrimary && (
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2.5 text-sm">
                                    <Mail className="w-4 h-4 text-gray-300" />
                                    <span className="text-gray-200">{lead.emailPrimary}</span>
                                </div>
                                <a
                                    href={`mailto:${lead.emailPrimary}`}
                                    className="px-3.5 py-1.5 rounded-lg bg-purple-500/15 text-purple-400 text-xs font-semibold hover:bg-purple-500/25 transition-colors border border-purple-500/20"
                                >
                                    Email
                                </a>
                            </div>
                        )}
                        <div className="flex items-center gap-2.5 text-sm">
                            <Clock className="w-4 h-4 text-gray-300" />
                            <span className="text-gray-200">Last contact: {getDaysText()}</span>
                        </div>
                        {lead.callAttemptCount > 0 && (
                            <div className="flex items-center gap-2.5 text-sm">
                                <PhoneOutgoing className="w-4 h-4 text-gray-300" />
                                <span className="text-gray-200">
                                    {lead.callAttemptCount} call attempt{lead.callAttemptCount !== 1 ? 's' : ''}
                                    {lead.lastCallAttemptAt && (
                                        <span className="text-gray-400 ml-1">
                                            · last {new Date(lead.lastCallAttemptAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                        </span>
                                    )}
                                </span>
                            </div>
                        )}
                        {lead.assignedAdvisor && (
                            <div className="flex items-center gap-2.5 text-sm">
                                <User className="w-4 h-4 text-gray-300" />
                                <span className="text-gray-200">{lead.assignedAdvisor.displayName}</span>
                            </div>
                        )}
                        {/* Next Action Date */}
                        <div className="pt-4 border-t border-[hsl(222,47%,22%)]">
                            <div className="flex items-center gap-2 mb-2.5">
                                <CalendarDays className="w-4 h-4 text-gray-300" />
                                <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Follow-up Date</span>
                                {dateSaved && <Check className="w-3.5 h-3.5 text-green-400" />}
                            </div>
                            <DateTimePicker
                                value={nextActionDateISO}
                                onChange={handleSaveNextAction}
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <StatusBadge status={status} />
                        <PriorityBadge priority={lead.priority} />
                    </div>

                    {/* Notes Section */}
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <FileText className="w-4 h-4 text-gray-300" />
                            <p className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Notes</p>
                        </div>
                        <NotesFeed
                            leadId={lead.id}
                            limit={3}
                            compact
                            refreshKey={noteRefreshKey}
                        />
                        <div className="mt-3">
                            <NoteInput
                                leadId={lead.id}
                                compact
                                onNoteSaved={() => setNoteRefreshKey(k => k + 1)}
                            />
                        </div>
                    </div>

                    {/* Status change */}
                    <div>
                        <p className="text-xs font-semibold text-gray-300 uppercase tracking-wider mb-3">Change Status</p>
                        <div className="flex flex-wrap gap-2">
                            {pipelineStatuses
                                .filter((s) => s !== status)
                                .map((targetStatus) => (
                                    <button
                                        key={targetStatus}
                                        onClick={() => onStatusChange(lead.id, targetStatus)}
                                        className="px-3.5 py-2.5 rounded-lg bg-[hsl(222,47%,14%)] text-gray-200 text-sm font-medium border border-[hsl(222,47%,24%)] hover:bg-[hsl(222,47%,18%)] hover:text-white transition-colors"
                                    >
                                        {STATUS_LABELS[targetStatus]}
                                    </button>
                                ))}
                        </div>
                    </div>

                    {/* Pipeline transfer */}
                    {transferTargets.length > 0 && (
                        <div>
                            <p className="text-xs font-semibold text-gray-300 uppercase tracking-wider mb-3">Transfer Pipeline</p>
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
                <div className="p-5 border-t border-[hsl(222,47%,22%)]">
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

            <QuickCallModal
                isOpen={showCallModal}
                onClose={() => setShowCallModal(false)}
                leadId={lead.id}
                leadName={displayName}
                callAttemptCount={lead.callAttemptCount}
                onSuccess={() => {
                    setShowCallModal(false);
                    setNoteRefreshKey(k => k + 1);
                }}
            />
        </>
    );
}
