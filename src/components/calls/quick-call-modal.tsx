'use client';

import { useState } from 'react';
import { Modal, Button, Input } from '@/components/ui';
import { CheckCircle, Clock, Loader2 } from 'lucide-react';
import { useCallOutcomes } from '@/hooks/use-call-outcomes';

interface QuickCallModalProps {
    isOpen: boolean;
    onClose: () => void;
    leadId: string;
    leadName: string;
    callAttemptCount?: number;
    onSuccess?: () => void;
}

export function QuickCallModal({
    isOpen,
    onClose,
    leadId,
    leadName,
    callAttemptCount = 0,
    onSuccess,
}: QuickCallModalProps) {
    const { outcomes, groupedOutcomes, isLoading: outcomesLoading } = useCallOutcomes();
    const [outcome, setOutcome] = useState('');
    const [summary, setSummary] = useState('');
    const [body, setBody] = useState('');
    const [followUpDays, setFollowUpDays] = useState<number | null>(null);
    const [customFollowUp, setCustomFollowUp] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const getFollowUpDate = (): string | null => {
        if (customFollowUp) return new Date(customFollowUp + 'T09:00:00').toISOString();
        if (followUpDays !== null) {
            const d = new Date();
            d.setDate(d.getDate() + followUpDays);
            d.setHours(9, 0, 0, 0);
            return d.toISOString();
        }
        return null;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!outcome) return;
        setIsSaving(true);

        try {
            const res = await fetch(`/api/leads/${leadId}/interactions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'call',
                    direction: 'outbound',
                    outcome,
                    summary,
                    body: body || undefined,
                }),
            });

            if (res.ok) {
                // Save follow-up date if set
                const followUpDate = getFollowUpDate();
                if (followUpDate) {
                    await fetch(`/api/leads/${leadId}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ nextActionAt: followUpDate }),
                    });
                }

                // Reset form
                setOutcome('');
                setSummary('');
                setBody('');
                setFollowUpDays(null);
                setCustomFollowUp('');
                onSuccess?.();
                onClose();
            }
        } catch (error) {
            console.error('Error logging call:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const categoryLabels: Record<string, { label: string; icon: string }> = {
        positive: { label: 'Positive', icon: '✅' },
        neutral: { label: 'Neutral', icon: '⚪' },
        negative: { label: 'Negative', icon: '❌' },
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Log Call">
            <div className="mb-4">
                <p className="text-sm text-gray-400">
                    {leadName}
                    {callAttemptCount > 0 && (
                        <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300">
                            Attempt #{callAttemptCount + 1}
                        </span>
                    )}
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Outcome dropdown with grouped options */}
                <div>
                    <label className="label">Outcome <span className="text-red-400">*</span></label>
                    {outcomesLoading ? (
                        <div className="flex items-center gap-2 py-2 text-gray-400 text-sm">
                            <Loader2 className="w-4 h-4 animate-spin" /> Loading outcomes...
                        </div>
                    ) : (
                        <select
                            className="input"
                            value={outcome}
                            onChange={(e) => setOutcome(e.target.value)}
                            required
                        >
                            <option value="">Select outcome...</option>
                            {(['positive', 'neutral', 'negative'] as const).map(cat => {
                                const items = groupedOutcomes[cat];
                                if (items.length === 0) return null;
                                const { label, icon } = categoryLabels[cat];
                                return (
                                    <optgroup key={cat} label={`${icon} ${label}`}>
                                        {items.map(o => (
                                            <option key={o.id} value={o.id}>{o.label}</option>
                                        ))}
                                    </optgroup>
                                );
                            })}
                        </select>
                    )}
                </div>

                {/* Summary */}
                <Input
                    label="Summary"
                    placeholder="Brief summary of the call..."
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    required
                />

                {/* Details (optional) */}
                <div>
                    <label className="label">Details (optional)</label>
                    <textarea
                        className="input min-h-[80px] resize-y"
                        placeholder="Additional notes..."
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                    />
                </div>

                {/* Follow-Up */}
                <div className="border-t border-gray-700 pt-4">
                    <label className="label flex items-center gap-2 mb-2">
                        <Clock className="w-4 h-4 text-orange-400" />
                        Schedule Follow-Up
                    </label>
                    <div className="flex flex-wrap gap-2 mb-2">
                        {[
                            { label: 'Tomorrow', days: 1 },
                            { label: '3 Days', days: 3 },
                            { label: '1 Week', days: 7 },
                        ].map(({ label, days }) => (
                            <button
                                key={days}
                                type="button"
                                onClick={() => { setFollowUpDays(days); setCustomFollowUp(''); }}
                                className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${followUpDays === days && !customFollowUp
                                    ? 'bg-orange-500/20 border-orange-500/40 text-orange-300'
                                    : 'border-gray-600 text-gray-400 hover:border-gray-400 hover:text-gray-200'
                                    }`}
                            >
                                {label}
                            </button>
                        ))}
                        <button
                            type="button"
                            onClick={() => { setFollowUpDays(null); setCustomFollowUp(''); }}
                            className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${followUpDays === null && !customFollowUp
                                ? 'bg-gray-500/20 border-gray-500/40 text-gray-300'
                                : 'border-gray-600 text-gray-400 hover:border-gray-400 hover:text-gray-200'
                                }`}
                        >
                            None
                        </button>
                    </div>
                    <input
                        type="date"
                        value={customFollowUp}
                        onChange={(e) => { setCustomFollowUp(e.target.value); setFollowUpDays(null); }}
                        className="input text-sm"
                        min={new Date().toISOString().split('T')[0]}
                    />
                    {(followUpDays !== null || customFollowUp) && (
                        <p className="text-xs text-orange-300 mt-1">
                            📅 Follow-up set for{' '}
                            {customFollowUp
                                ? new Date(customFollowUp + 'T09:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
                                : new Date(Date.now() + (followUpDays || 0) * 86400000).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
                            }
                        </p>
                    )}
                </div>

                <div className="flex justify-end gap-3 pt-2">
                    <Button type="button" variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="submit" isLoading={isSaving} disabled={!outcome}>
                        <CheckCircle className="w-4 h-4" />
                        Save
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
