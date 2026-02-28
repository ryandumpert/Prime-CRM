'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout';
import { Button, Card, StatusBadge, PriorityBadge, Modal, Select, Input } from '@/components/ui';
import {
    Phone,
    Mail,
    MessageSquare,
    ChevronRight,
    Clock,
    Loader2,
    PlayCircle,
    CheckCircle,
    XCircle,
    AlertTriangle,
    RefreshCw,
    FileText,
    ChevronDown,
    ChevronUp
} from 'lucide-react';
import { formatPhoneDisplay, formatDateTime, daysSinceContact } from '@/lib/utils';
import {
    LeadStatusType,
    PriorityType,
    CALL_OUTCOMES,
    OUTCOME_LABELS
} from '@/lib/constants';
import { NoteInput } from '@/components/notes/note-input';
import { NotesFeed } from '@/components/notes/notes-feed';

interface Lead {
    id: string;
    firstName: string | null;
    lastName: string | null;
    fullName: string | null;
    phonePrimary: string | null;
    emailPrimary: string | null;
    status: LeadStatusType;
    priority: PriorityType;
    lastContactedAt: string | null;
    nextActionAt: string | null;
    doNotCall: boolean;
    doNotText: boolean;
    doNotEmail: boolean;
    assignedAdvisor: { displayName: string } | null;
}

export default function CallListPage() {
    const router = useRouter();
    const [leads, setLeads] = useState<Lead[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isSessionMode, setIsSessionMode] = useState(false);
    const [showOutcomeModal, setShowOutcomeModal] = useState(false);
    const [noteRefreshKey, setNoteRefreshKey] = useState(0);

    const fetchCallList = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/leads?callListOnly=true&pageSize=100');
            const data = await res.json();
            setLeads(data.data || []);
        } catch (error) {
            console.error('Error fetching call list:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchCallList();
    }, [fetchCallList]);

    const currentLead = leads[currentIndex];

    const getDisplayName = (lead: Lead) => {
        if (lead.fullName) return lead.fullName;
        if (lead.firstName || lead.lastName) {
            return `${lead.firstName || ''} ${lead.lastName || ''}`.trim();
        }
        return 'Unknown';
    };

    const getDaysText = (lastContactedAt: string | null) => {
        if (!lastContactedAt) return 'Never contacted';
        const days = daysSinceContact(lastContactedAt);
        if (days === 0) return 'Today';
        if (days === 1) return '1 day ago';
        return `${days} days ago`;
    };

    const handleNextLead = () => {
        if (currentIndex < leads.length - 1) {
            setCurrentIndex(currentIndex + 1);
        } else {
            // End of list
            setIsSessionMode(false);
            fetchCallList(); // Refresh the list
        }
    };

    const handleCallComplete = async (outcome: string, summary: string) => {
        if (!currentLead) return;

        try {
            await fetch(`/api/leads/${currentLead.id}/interactions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'call',
                    direction: 'outbound',
                    outcome,
                    summary,
                }),
            });

            // Remove this lead from the list if we made contact
            if (['connected', 'left_voicemail'].includes(outcome)) {
                setLeads(leads.filter((_, i) => i !== currentIndex));
                if (currentIndex >= leads.length - 1) {
                    setCurrentIndex(Math.max(0, leads.length - 2));
                }
            }

            setShowOutcomeModal(false);

            if (isSessionMode) {
                handleNextLead();
            }
        } catch (error) {
            console.error('Error logging call:', error);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }

    return (
        <>
            <Header
                title="Daily Call List"
                subtitle={`${leads.length} leads need follow-up (not contacted in 5+ days)`}
            />

            {leads.length === 0 ? (
                <Card>
                    <div className="text-center py-16">
                        <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-500/50" />
                        <h2 className="text-xl font-semibold mb-2">All caught up!</h2>
                        <p className="text-gray-300 max-w-md mx-auto">
                            Great work! All your leads have been contacted within the last 5 days.
                            Check back tomorrow for new follow-ups.
                        </p>
                        <Button className="mt-6" onClick={fetchCallList}>
                            <RefreshCw className="w-4 h-4" />
                            Refresh List
                        </Button>
                    </div>
                </Card>
            ) : isSessionMode && currentLead ? (
                // Session Mode - One lead at a time
                <CallSessionView
                    lead={currentLead}
                    currentIndex={currentIndex}
                    totalLeads={leads.length}
                    onCall={() => setShowOutcomeModal(true)}
                    onSkip={handleNextLead}
                    onExit={() => setIsSessionMode(false)}
                    onViewDetails={() => router.push(`/leads/${currentLead.id}`)}
                    noteRefreshKey={noteRefreshKey}
                    onNoteSaved={() => setNoteRefreshKey(k => k + 1)}
                />
            ) : (
                // List Mode
                <>
                    <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 mb-6">
                        <Button onClick={() => { setCurrentIndex(0); setIsSessionMode(true); }}>
                            <PlayCircle className="w-4 h-4" />
                            Start Calling Session
                        </Button>
                        <Button variant="secondary" onClick={fetchCallList}>
                            <RefreshCw className="w-4 h-4" />
                            Refresh
                        </Button>
                    </div>

                    <Card className="p-0">
                        <div className="divide-y divide-[hsl(222,47%,15%)]">
                            {leads.map((lead, index) => (
                                <div
                                    key={lead.id}
                                    className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 p-6 hover:bg-[hsl(222,47%,12%)] active:bg-[hsl(222,47%,14%)] transition-colors cursor-pointer"
                                    onClick={() => router.push(`/leads/${lead.id}`)}
                                >
                                    <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0">
                                        {/* Priority indicator */}
                                        <div className={`w-1 h-10 md:h-12 rounded-full shrink-0 ${lead.priority === 'high' ? 'bg-red-500' :
                                            lead.priority === 'normal' ? 'bg-blue-500' : 'bg-gray-500'
                                            }`} />

                                        {/* Lead info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 md:gap-3">
                                                <span className="font-medium truncate">{getDisplayName(lead)}</span>
                                                <StatusBadge status={lead.status} size="sm" />
                                            </div>
                                            <div className="flex items-center gap-3 md:gap-4 mt-1 text-sm text-gray-300">
                                                {lead.phonePrimary && (
                                                    <span className="text-xs md:text-sm">{formatPhoneDisplay(lead.phonePrimary)}</span>
                                                )}
                                                <span className="flex items-center gap-1 text-orange-400 text-xs md:text-sm">
                                                    <Clock className="w-3 h-3" />
                                                    {getDaysText(lead.lastContactedAt)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Quick actions */}
                                    <div className="flex items-center gap-2 pl-4 md:pl-0" onClick={(e) => e.stopPropagation()}>
                                        {lead.phonePrimary && !lead.doNotCall && (
                                            <Button
                                                variant="success"
                                                size="sm"
                                                onClick={() => {
                                                    setCurrentIndex(index);
                                                    setShowOutcomeModal(true);
                                                }}
                                            >
                                                <Phone className="w-4 h-4" />
                                                <span className="hidden md:inline">Call</span>
                                            </Button>
                                        )}
                                        {lead.doNotCall && (
                                            <span className="text-xs text-red-400 flex items-center gap-1">
                                                <AlertTriangle className="w-3 h-3" /> DNC
                                            </span>
                                        )}
                                        <ChevronRight className="w-5 h-5 text-gray-400 hidden md:block" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                </>
            )}

            {/* Call Outcome Modal */}
            <CallOutcomeModal
                isOpen={showOutcomeModal}
                onClose={() => setShowOutcomeModal(false)}
                onSubmit={handleCallComplete}
                leadName={currentLead ? getDisplayName(currentLead) : ''}
            />
        </>
    );
}

// Session View Component
function CallSessionView({
    lead,
    currentIndex,
    totalLeads,
    onCall,
    onSkip,
    onExit,
    onViewDetails,
    noteRefreshKey,
    onNoteSaved,
}: {
    lead: Lead;
    currentIndex: number;
    totalLeads: number;
    onCall: () => void;
    onSkip: () => void;
    onExit: () => void;
    onViewDetails: () => void;
    noteRefreshKey: number;
    onNoteSaved: () => void;
}) {
    const [showNotes, setShowNotes] = useState(true);
    const getDisplayName = () => {
        if (lead.fullName) return lead.fullName;
        if (lead.firstName || lead.lastName) {
            return `${lead.firstName || ''} ${lead.lastName || ''}`.trim();
        }
        return 'Unknown';
    };

    return (
        <div className="max-w-2xl mx-auto">
            {/* Progress */}
            <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-gray-300">
                    Lead {currentIndex + 1} of {totalLeads}
                </span>
                <Button variant="ghost" size="sm" onClick={onExit}>
                    Exit Session
                </Button>
            </div>
            <div className="h-2 bg-[hsl(222,47%,15%)] rounded-full mb-6">
                <div
                    className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-300"
                    style={{ width: `${((currentIndex + 1) / totalLeads) * 100}%` }}
                />
            </div>

            {/* Lead Card */}
            <Card className="mb-6">
                <div className="text-center mb-6">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center mx-auto mb-4">
                        <span className="text-3xl font-bold text-white">
                            {getDisplayName().charAt(0).toUpperCase()}
                        </span>
                    </div>
                    <h2 className="text-2xl font-bold mb-2">{getDisplayName()}</h2>
                    <div className="flex items-center justify-center gap-3">
                        <StatusBadge status={lead.status} />
                        <PriorityBadge priority={lead.priority} />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6 text-center">
                    <div className="p-4 rounded-xl bg-[hsl(222,47%,12%)]">
                        <p className="text-sm text-gray-400 mb-1">Phone</p>
                        <p className="font-medium text-base md:text-lg">{formatPhoneDisplay(lead.phonePrimary)}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-[hsl(222,47%,12%)]">
                        <p className="text-sm text-gray-400 mb-1">Last Contact</p>
                        <p className="font-medium text-lg text-orange-400">
                            {lead.lastContactedAt
                                ? `${daysSinceContact(lead.lastContactedAt)} days ago`
                                : 'Never'
                            }
                        </p>
                    </div>
                </div>

                {/* Notes Section */}
                <div className="mb-6">
                    <button
                        onClick={() => setShowNotes(!showNotes)}
                        className="flex items-center gap-2 w-full mb-3 text-left"
                    >
                        <FileText className="w-4 h-4 text-gray-400" />
                        <span className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Call Notes</span>
                        {showNotes ? (
                            <ChevronUp className="w-3.5 h-3.5 text-gray-400 ml-auto" />
                        ) : (
                            <ChevronDown className="w-3.5 h-3.5 text-gray-400 ml-auto" />
                        )}
                    </button>
                    {showNotes && (
                        <>
                            <NotesFeed
                                leadId={lead.id}
                                limit={3}
                                refreshKey={noteRefreshKey}
                            />
                            <div className="mt-3">
                                <NoteInput
                                    leadId={lead.id}
                                    placeholder="Add a call note..."
                                    onNoteSaved={onNoteSaved}
                                />
                            </div>
                        </>
                    )}
                </div>

                {/* Compliance warnings */}
                {lead.doNotCall && (
                    <div className="flex items-center gap-2 p-3 mb-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
                        <AlertTriangle className="w-4 h-4" />
                        <span>This lead has a Do Not Call flag</span>
                    </div>
                )}

                {/* Actions */}
                <div className="flex flex-col gap-3">
                    {lead.phonePrimary && !lead.doNotCall && (
                        <Button className="w-full btn-lg" variant="success" onClick={onCall}>
                            <Phone className="w-5 h-5" />
                            Call Now
                        </Button>
                    )}
                    <div className="flex gap-3">
                        <Button variant="secondary" className="flex-1" onClick={onViewDetails}>
                            View Details
                        </Button>
                        <Button variant="ghost" className="flex-1" onClick={onSkip}>
                            Skip
                            <ChevronRight className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </Card>
        </div>
    );
}

// Call Outcome Modal
function CallOutcomeModal({
    isOpen,
    onClose,
    onSubmit,
    leadName,
}: {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (outcome: string, summary: string) => void;
    leadName: string;
}) {
    const [outcome, setOutcome] = useState('');
    const [summary, setSummary] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        await onSubmit(outcome, summary);
        setOutcome('');
        setSummary('');
        setIsLoading(false);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Log Call Result">
            <p className="text-gray-300 mb-4">How did the call with <strong>{leadName}</strong> go?</p>
            <form onSubmit={handleSubmit} className="space-y-4">
                <Select
                    label="Outcome"
                    options={[
                        { value: '', label: 'Select outcome...' },
                        ...CALL_OUTCOMES.map(o => ({ value: o, label: OUTCOME_LABELS[o] })),
                    ]}
                    value={outcome}
                    onChange={(e) => setOutcome(e.target.value)}
                    required
                />

                <Input
                    label="Summary"
                    placeholder="Brief notes about the call..."
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    required
                />

                <div className="flex justify-end gap-3 pt-2">
                    <Button type="button" variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="submit" isLoading={isLoading}>
                        <CheckCircle className="w-4 h-4" />
                        Save & Continue
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
