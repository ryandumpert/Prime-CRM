'use client';

import { useEffect, useState, use } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout';
import { Button, Card, StatusBadge, PriorityBadge, Select, Input, Modal, DateTimePicker } from '@/components/ui';
import {
    Phone,
    Mail,
    MessageSquare,
    ArrowLeft,
    Clock,
    Calendar,
    User,
    FileText,
    AlertTriangle,
    CheckCircle,
    XCircle,
    Loader2,
    ChevronDown,
    Plus,
    Ban,
    Archive,
    Activity
} from 'lucide-react';
import { formatPhoneDisplay, formatDateTime, daysSinceContact } from '@/lib/utils';
import {
    ALLOWED_TRANSITIONS,
    STATUS_LABELS,
    LEAD_STATUSES,
    LeadStatusType,
    PriorityType,
    CALL_OUTCOMES,
    TEXT_OUTCOMES,
    EMAIL_OUTCOMES,
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
    statusUpdatedAt: string | null;
    assignedAdvisor: { id: string; displayName: string; email: string } | null;
    doNotCall: boolean;
    doNotText: boolean;
    doNotEmail: boolean;
    consentSms: boolean | null;
    consentCall: boolean | null;
    rawImportPayload: Record<string, any> | null;
    createdAt: string;
    updatedAt: string;
    interactions: Interaction[];
}

interface Interaction {
    id: string;
    type: string;
    direction: string | null;
    outcome: string | null;
    summary: string | null;
    body: string | null;
    occurredAt: string;
    user: { id: string; displayName: string };
}

export default function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const { data: session } = useSession();
    const router = useRouter();
    const [lead, setLead] = useState<Lead | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [showInteractionModal, setShowInteractionModal] = useState(false);
    const [interactionType, setInteractionType] = useState<'call' | 'text' | 'email' | 'note'>('note');
    const [activeTab, setActiveTab] = useState<'notes' | 'activity'>('notes');
    const [noteRefreshKey, setNoteRefreshKey] = useState(0);

    const isAdmin = session?.user?.role === 'admin';

    useEffect(() => {
        fetchLead();
    }, [id]);

    const fetchLead = async () => {
        try {
            const res = await fetch(`/api/leads/${id}`);
            if (res.status === 404) {
                router.push('/leads');
                return;
            }
            const data = await res.json();
            if (data.data) {
                setLead(data.data);
            }
        } catch (error) {
            console.error('Error fetching lead:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const updateLead = async (updates: Partial<Lead>) => {
        if (!lead) return;
        setIsSaving(true);
        try {
            const res = await fetch(`/api/leads/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates),
            });
            const data = await res.json();
            if (data.data) {
                setLead(prev => ({ ...prev!, ...data.data }));
                fetchLead(); // Refresh to get updated interactions
            }
        } catch (error) {
            console.error('Error updating lead:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const getDisplayName = () => {
        if (!lead) return 'Loading...';
        if (lead.fullName) return lead.fullName;
        if (lead.firstName || lead.lastName) {
            return `${lead.firstName || ''} ${lead.lastName || ''}`.trim();
        }
        return 'Unknown';
    };

    const getAllowedStatuses = (): LeadStatusType[] => {
        if (!lead) return [];
        if (isAdmin) {
            // Admins can set any status
            return LEAD_STATUSES as unknown as LeadStatusType[];
        }
        return ALLOWED_TRANSITIONS[lead.status] || [];
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }

    if (!lead) {
        return (
            <div className="text-center py-16">
                <p className="text-gray-300">Lead not found</p>
            </div>
        );
    }

    const days = daysSinceContact(lead.lastContactedAt);
    const needsFollowUp = days === null || days >= 5;

    return (
        <>
            <div className="flex items-center gap-4 mb-6">
                <Button variant="ghost" onClick={() => router.back()}>
                    <ArrowLeft className="w-4 h-4" />
                    Back
                </Button>
            </div>

            {/* Header with quick actions */}
            <div className="flex flex-col lg:flex-row gap-6 mb-6">
                {/* Lead Info Card */}
                <Card className="flex-1">
                    <div className="flex items-start justify-between mb-4">
                        <div>
                            <h1 className="text-xl md:text-2xl font-bold">{getDisplayName()}</h1>
                            <div className="flex items-center gap-3 mt-2">
                                <StatusBadge status={lead.status} />
                                <PriorityBadge priority={lead.priority} />
                                {needsFollowUp && (
                                    <span className="flex items-center gap-1 text-orange-400 text-sm">
                                        <AlertTriangle className="w-4 h-4" />
                                        Needs follow-up
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {isSaving && <Loader2 className="w-4 h-4 animate-spin text-blue-400" />}
                        </div>
                    </div>

                    {/* Contact Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <div>
                            <p className="text-sm text-gray-400 mb-1">Phone</p>
                            <p className="font-medium flex items-center gap-2">
                                {formatPhoneDisplay(lead.phonePrimary)}
                                {lead.doNotCall && (
                                    <span className="text-xs text-red-400 flex items-center gap-1">
                                        <Ban className="w-3 h-3" /> DNC
                                    </span>
                                )}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-400 mb-1">Email</p>
                            <p className="font-medium flex items-center gap-2">
                                {lead.emailPrimary || 'N/A'}
                                {lead.doNotEmail && (
                                    <span className="text-xs text-red-400 flex items-center gap-1">
                                        <Ban className="w-3 h-3" /> DNE
                                    </span>
                                )}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-400 mb-1">Last Contacted</p>
                            <p className={`font-medium ${needsFollowUp ? 'text-orange-400' : ''}`}>
                                {lead.lastContactedAt ? formatDateTime(lead.lastContactedAt) : 'Never'}
                                {days !== null && ` (${days} days ago)`}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-400 mb-1">Assigned To</p>
                            <p className="font-medium">
                                {lead.assignedAdvisor?.displayName || 'Unassigned'}
                            </p>
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="grid grid-cols-2 md:flex md:flex-wrap gap-3">
                        {lead.phonePrimary && (
                            <Button
                                variant="success"
                                disabled={lead.doNotCall}
                                className={lead.doNotCall ? 'opacity-50' : ''}
                                onClick={() => {
                                    if (!lead.doNotCall) {
                                        setInteractionType('call');
                                        setShowInteractionModal(true);
                                    }
                                }}
                            >
                                <Phone className="w-4 h-4" />
                                Call
                            </Button>
                        )}
                        {lead.emailPrimary && (
                            <Button
                                variant="secondary"
                                disabled={lead.doNotEmail}
                                onClick={() => {
                                    if (!lead.doNotEmail) {
                                        setInteractionType('email');
                                        setShowInteractionModal(true);
                                    }
                                }}
                            >
                                <Mail className="w-4 h-4" />
                                Email
                            </Button>
                        )}
                        {lead.phonePrimary && (
                            <Button
                                variant="secondary"
                                disabled={lead.doNotText}
                                onClick={() => {
                                    if (!lead.doNotText) {
                                        setInteractionType('text');
                                        setShowInteractionModal(true);
                                    }
                                }}
                            >
                                <MessageSquare className="w-4 h-4" />
                                Text
                            </Button>
                        )}
                        <Button
                            variant="ghost"
                            onClick={() => {
                                setInteractionType('note');
                                setShowInteractionModal(true);
                            }}
                        >
                            <Plus className="w-4 h-4" />
                            Add Note
                        </Button>
                    </div>
                </Card>

                {/* Status & Settings */}
                <Card className="w-full lg:w-80">
                    <h3 className="font-semibold mb-4">Lead Settings</h3>

                    {/* Status Update */}
                    <div className="mb-4">
                        <label className="label">Status</label>
                        <Select
                            options={getAllowedStatuses().map(s => ({
                                value: s,
                                label: STATUS_LABELS[s],
                            }))}
                            value={lead.status}
                            onChange={(e) => updateLead({ status: e.target.value as LeadStatusType })}
                        />
                    </div>

                    {/* Priority */}
                    <div className="mb-4">
                        <label className="label">Priority</label>
                        <Select
                            options={[
                                { value: 'low', label: 'Low' },
                                { value: 'normal', label: 'Normal' },
                                { value: 'high', label: 'High' },
                            ]}
                            value={lead.priority}
                            onChange={(e) => updateLead({ priority: e.target.value as PriorityType })}
                        />
                    </div>

                    {/* Next Action Date */}
                    <div className="mb-4">
                        <DateTimePicker
                            label="Next Action Date"
                            value={lead.nextActionAt ? new Date(lead.nextActionAt).toISOString() : ''}
                            onChange={(isoValue) => updateLead({ nextActionAt: isoValue || null } as any)}
                        />
                    </div>

                    {/* Compliance Flags (Admin only) */}
                    {isAdmin && (
                        <div className="border-t border-[hsl(222,47%,18%)] pt-4 mt-4">
                            <p className="text-sm font-medium text-gray-300 mb-3">Compliance Flags</p>
                            <div className="space-y-2">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={lead.doNotCall}
                                        onChange={(e) => updateLead({ doNotCall: e.target.checked })}
                                        className="w-4 h-4 rounded"
                                    />
                                    <span className="text-sm">Do Not Call</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={lead.doNotText}
                                        onChange={(e) => updateLead({ doNotText: e.target.checked })}
                                        className="w-4 h-4 rounded"
                                    />
                                    <span className="text-sm">Do Not Text</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={lead.doNotEmail}
                                        onChange={(e) => updateLead({ doNotEmail: e.target.checked })}
                                        className="w-4 h-4 rounded"
                                    />
                                    <span className="text-sm">Do Not Email</span>
                                </label>
                            </div>
                        </div>
                    )}

                    {/* Archive (Admin only) */}
                    {isAdmin && (
                        <div className="border-t border-[hsl(222,47%,18%)] pt-4 mt-4">
                            <Button
                                variant="danger"
                                className="w-full"
                                onClick={async () => {
                                    if (!confirm('Archive this lead? It will be hidden from all views.')) return;
                                    try {
                                        const res = await fetch(`/api/leads/${lead.id}/archive`, {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ archived: true }),
                                        });
                                        if (res.ok) {
                                            router.push('/leads');
                                        }
                                    } catch (error) {
                                        console.error('Error archiving lead:', error);
                                    }
                                }}
                            >
                                <Archive className="w-4 h-4" />
                                Archive Lead
                            </Button>
                        </div>
                    )}
                </Card>
            </div>

            {/* Notes & Activity Tabs */}
            <Card>
                {/* Tab Header */}
                <div className="flex items-center gap-1 p-1 mb-5 bg-[hsl(222,47%,10%)] rounded-xl w-fit">
                    <button
                        onClick={() => setActiveTab('notes')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'notes'
                            ? 'bg-[hsl(222,47%,16%)] text-white shadow-sm'
                            : 'text-gray-400 hover:text-gray-200'
                            }`}
                    >
                        <FileText className="w-4 h-4" />
                        Notes
                    </button>
                    <button
                        onClick={() => setActiveTab('activity')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'activity'
                            ? 'bg-[hsl(222,47%,16%)] text-white shadow-sm'
                            : 'text-gray-400 hover:text-gray-200'
                            }`}
                    >
                        <Activity className="w-4 h-4" />
                        All Activity
                    </button>
                </div>

                {activeTab === 'notes' ? (
                    /* Notes Tab */
                    <div>
                        <div className="mb-4">
                            <NoteInput
                                leadId={lead.id}
                                placeholder="Write a note about this lead..."
                                onNoteSaved={() => {
                                    setNoteRefreshKey(k => k + 1);
                                    fetchLead();
                                }}
                            />
                        </div>
                        <NotesFeed
                            leadId={lead.id}
                            limit={0}
                            showSeeAll={false}
                            refreshKey={noteRefreshKey}
                        />
                    </div>
                ) : (
                    /* Activity Tab */
                    <div>
                        <h3 className="font-semibold mb-4">Activity Timeline</h3>
                        {lead.interactions.length === 0 ? (
                            <div className="text-center py-8 text-gray-400">
                                <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                <p>No interactions yet</p>
                                <p className="text-sm">Contact this lead to start the timeline</p>
                            </div>
                        ) : (
                            <div className="timeline">
                                {lead.interactions.map((interaction) => (
                                    <TimelineItem key={interaction.id} interaction={interaction} />
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </Card>

            {/* Interaction Modal */}
            <InteractionModal
                isOpen={showInteractionModal}
                onClose={() => setShowInteractionModal(false)}
                type={interactionType}
                leadId={lead.id}
                onSuccess={() => {
                    fetchLead();
                    setShowInteractionModal(false);
                }}
            />
        </>
    );
}

function TimelineItem({ interaction }: { interaction: Interaction }) {
    const getIcon = () => {
        switch (interaction.type) {
            case 'call':
                return <Phone className="w-4 h-4" />;
            case 'text':
                return <MessageSquare className="w-4 h-4" />;
            case 'email':
                return <Mail className="w-4 h-4" />;
            case 'note':
                return <FileText className="w-4 h-4" />;
            case 'status_change':
                return <ChevronDown className="w-4 h-4" />;
            default:
                return <User className="w-4 h-4" />;
        }
    };

    const getTypeLabel = () => {
        const labels: Record<string, string> = {
            call: 'Call',
            text: 'Text Message',
            email: 'Email',
            note: 'Note',
            status_change: 'Status Change',
            assignment_change: 'Assignment Change',
        };
        return labels[interaction.type] || interaction.type;
    };

    const getOutcomeColor = () => {
        if (!interaction.outcome) return '';
        const successOutcomes = ['connected', 'sent', 'delivered', 'opened', 'left_voicemail'];
        const failOutcomes = ['failed', 'bounced', 'wrong_number', 'no_answer'];
        if (successOutcomes.includes(interaction.outcome)) return 'text-green-400';
        if (failOutcomes.includes(interaction.outcome)) return 'text-red-400';
        return 'text-blue-400';
    };

    return (
        <div className="timeline-item">
            <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-[hsl(222,47%,14%)] text-gray-300">
                    {getIcon()}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                        <div>
                            <p className="font-medium">
                                {getTypeLabel()}
                                {interaction.outcome && (
                                    <span className={`ml-2 text-sm ${getOutcomeColor()}`}>
                                        • {OUTCOME_LABELS[interaction.outcome] || interaction.outcome}
                                    </span>
                                )}
                            </p>
                            {interaction.summary && (
                                <p className="text-gray-300 text-sm mt-1">{interaction.summary}</p>
                            )}
                            {interaction.body && (
                                <p className="text-gray-400 text-sm mt-1 line-clamp-2">{interaction.body}</p>
                            )}
                        </div>
                        <div className="text-right text-sm text-gray-400 whitespace-nowrap">
                            {formatDateTime(interaction.occurredAt)}
                        </div>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">
                        by {interaction.user.displayName}
                    </p>
                </div>
            </div>
        </div>
    );
}

// Interaction Modal Component
function InteractionModal({
    isOpen,
    onClose,
    type,
    leadId,
    onSuccess,
}: {
    isOpen: boolean;
    onClose: () => void;
    type: 'call' | 'text' | 'email' | 'note';
    leadId: string;
    onSuccess: () => void;
}) {
    const [outcome, setOutcome] = useState('');
    const [summary, setSummary] = useState('');
    const [body, setBody] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const getOutcomes = () => {
        switch (type) {
            case 'call':
                return CALL_OUTCOMES;
            case 'text':
                return TEXT_OUTCOMES;
            case 'email':
                return EMAIL_OUTCOMES;
            default:
                return [];
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const res = await fetch(`/api/leads/${leadId}/interactions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type,
                    direction: type === 'note' ? 'internal' : 'outbound',
                    outcome: outcome || undefined,
                    summary,
                    body: body || undefined,
                }),
            });

            if (res.ok) {
                setOutcome('');
                setSummary('');
                setBody('');
                onSuccess();
            }
        } catch (error) {
            console.error('Error creating interaction:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const typeLabels = {
        call: 'Log Call',
        text: 'Log Text Message',
        email: 'Log Email',
        note: 'Add Note',
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={typeLabels[type]}>
            <form onSubmit={handleSubmit} className="space-y-4">
                {type !== 'note' && (
                    <Select
                        label="Outcome"
                        options={[
                            { value: '', label: 'Select outcome...' },
                            ...getOutcomes().map(o => ({ value: o, label: OUTCOME_LABELS[o] || o })),
                        ]}
                        value={outcome}
                        onChange={(e) => setOutcome(e.target.value)}
                        required
                    />
                )}

                <Input
                    label="Summary"
                    placeholder="Brief summary of the interaction..."
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    required
                />

                <div>
                    <label className="label">Details (optional)</label>
                    <textarea
                        className="input min-h-[100px] resize-y"
                        placeholder="Additional details..."
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                    />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                    <Button type="button" variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="submit" isLoading={isLoading}>
                        <CheckCircle className="w-4 h-4" />
                        Save
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
