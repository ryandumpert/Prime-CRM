'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Header } from '@/components/layout';
import { Card, Button, Input } from '@/components/ui';
import {
    Settings,
    Database,
    Shield,
    Bell,
    Palette,
    Save,
    PhoneOutgoing,
    Loader2,
    Check,
    Edit3,
    ImagePlus,
    Trash2,
    Upload,
    Plus,
    X,
    GripVertical,
    Phone,
} from 'lucide-react';
import { useCompanyLogo } from '@/components/company-logo';
import { useCallOutcomes, invalidateCallOutcomesCache, CallOutcomeOption } from '@/hooks/use-call-outcomes';

interface AdvisorQuota {
    id: string;
    displayName: string;
    minimumDailyCalls: number;
}

export default function SettingsPage() {
    const { data: session } = useSession();
    const isAdmin = session?.user?.role === 'admin';
    const [advisors, setAdvisors] = useState<AdvisorQuota[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState('');
    const [savingId, setSavingId] = useState<string | null>(null);
    const [savedId, setSavedId] = useState<string | null>(null);

    // Logo upload state
    const { logoUrl, refresh: refreshLogo } = useCompanyLogo();
    const [isUploadingLogo, setIsUploadingLogo] = useState(false);
    const [logoError, setLogoError] = useState<string | null>(null);
    const [logoSuccess, setLogoSuccess] = useState(false);
    const [isDragging, setIsDragging] = useState(false);

    const fetchAdvisors = useCallback(async () => {
        if (!isAdmin) return;
        setIsLoading(true);
        try {
            const res = await fetch('/api/users');
            const data = await res.json();
            if (data.data) {
                setAdvisors(
                    data.data
                        .filter((u: any) => u.role === 'advisor' && u.active)
                        .map((u: any) => ({
                            id: u.id,
                            displayName: u.displayName,
                            minimumDailyCalls: u.minimumDailyCalls ?? 20,
                        }))
                );
            }
        } catch (error) {
            console.error('Error fetching advisors:', error);
        } finally {
            setIsLoading(false);
        }
    }, [isAdmin]);

    useEffect(() => {
        fetchAdvisors();
    }, [fetchAdvisors]);

    const handleSaveQuota = async (advisorId: string, newValue: number) => {
        setSavingId(advisorId);
        try {
            const res = await fetch(`/api/users/${advisorId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ minimumDailyCalls: newValue }),
            });

            if (res.ok) {
                setAdvisors((prev) =>
                    prev.map((a) =>
                        a.id === advisorId ? { ...a, minimumDailyCalls: newValue } : a
                    )
                );
                setEditingId(null);
                setSavedId(advisorId);
                setTimeout(() => setSavedId(null), 2000);
            }
        } catch (error) {
            console.error('Error saving quota:', error);
        } finally {
            setSavingId(null);
        }
    };

    const handleLogoUpload = async (file: File) => {
        setLogoError(null);
        setLogoSuccess(false);
        setIsUploadingLogo(true);

        const formData = new FormData();
        formData.append('logo', file);

        try {
            const res = await fetch('/api/settings/logo', {
                method: 'POST',
                body: formData,
            });
            const data = await res.json();

            if (!res.ok) {
                setLogoError(data.error || 'Upload failed');
                return;
            }

            setLogoSuccess(true);
            refreshLogo();
            setTimeout(() => setLogoSuccess(false), 3000);
        } catch (error) {
            setLogoError('Upload failed. Please try again.');
        } finally {
            setIsUploadingLogo(false);
        }
    };

    const handleLogoRemove = async () => {
        setLogoError(null);
        setIsUploadingLogo(true);
        try {
            await fetch('/api/settings/logo', { method: 'DELETE' });
            refreshLogo();
        } catch (error) {
            setLogoError('Failed to remove logo.');
        } finally {
            setIsUploadingLogo(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) handleLogoUpload(file);
    };

    return (
        <>
            <Header
                title="Settings"
                subtitle="Manage CRM configuration"
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* General Settings */}
                <Card>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 rounded-lg bg-blue-500/20">
                            <Settings className="w-5 h-5 text-blue-400" />
                        </div>
                        <h3 className="font-semibold">General Settings</h3>
                    </div>
                    <div className="space-y-4">
                        <Input
                            label="Company Name"
                            defaultValue="Prime Loan Advisors"
                        />
                        <Input
                            label="Support Email"
                            type="email"
                            defaultValue="support@primeloanadvisors.com"
                        />
                        <Button className="mt-2">
                            <Save className="w-4 h-4" />
                            Save Changes
                        </Button>
                    </div>
                </Card>

                {/* Company Logo */}
                {isAdmin && (
                    <Card>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 rounded-lg bg-indigo-500/20">
                                <ImagePlus className="w-5 h-5 text-indigo-400" />
                            </div>
                            <div>
                                <h3 className="font-semibold">Company Logo</h3>
                                <p className="text-xs text-gray-400 mt-0.5">Displayed across the entire application</p>
                            </div>
                        </div>

                        {/* Preview */}
                        <div className="flex items-center gap-5 mb-5">
                            <div className="w-20 h-20 rounded-xl border-2 border-dashed border-[hsl(222,47%,22%)] flex items-center justify-center overflow-hidden bg-[hsl(222,47%,10%)]">
                                {logoUrl ? (
                                    <img
                                        src={logoUrl}
                                        alt="Current logo"
                                        className="w-full h-full object-contain p-1"
                                    />
                                ) : (
                                    <div className="text-center">
                                        <ImagePlus className="w-6 h-6 text-gray-600 mx-auto" />
                                        <p className="text-[10px] text-gray-600 mt-1">No logo</p>
                                    </div>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm text-gray-300">
                                    {logoUrl ? 'Logo uploaded' : 'No logo set'}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                    Appears in sidebar, login page, and reports
                                </p>
                            </div>
                        </div>

                        {/* Drop zone */}
                        <div
                            className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer ${isDragging
                                ? 'border-indigo-500 bg-indigo-500/10'
                                : 'border-[hsl(222,47%,22%)] hover:border-[hsl(222,47%,30%)] bg-[hsl(222,47%,10%)]'
                                }`}
                            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                            onDragLeave={() => setIsDragging(false)}
                            onDrop={handleDrop}
                            onClick={() => {
                                const input = document.createElement('input');
                                input.type = 'file';
                                input.accept = 'image/png,image/jpeg,image/svg+xml,image/webp';
                                input.onchange = (e: any) => {
                                    const file = e.target.files[0];
                                    if (file) handleLogoUpload(file);
                                };
                                input.click();
                            }}
                        >
                            {isUploadingLogo ? (
                                <Loader2 className="w-6 h-6 animate-spin text-indigo-400 mx-auto" />
                            ) : (
                                <>
                                    <Upload className="w-6 h-6 text-gray-500 mx-auto mb-2" />
                                    <p className="text-sm text-gray-300">Drop image here or click to upload</p>
                                    <p className="text-xs text-gray-500 mt-1">
                                        PNG, JPEG, SVG, or WebP · Max 2MB
                                    </p>
                                </>
                            )}
                        </div>

                        {/* Status messages */}
                        {logoError && (
                            <p className="text-sm text-red-400 mt-3">{logoError}</p>
                        )}
                        {logoSuccess && (
                            <p className="text-sm text-green-400 mt-3 flex items-center gap-1">
                                <Check className="w-4 h-4" /> Logo updated successfully
                            </p>
                        )}

                        {/* Remove button */}
                        {logoUrl && !isUploadingLogo && (
                            <button
                                onClick={(e) => { e.stopPropagation(); handleLogoRemove(); }}
                                className="flex items-center gap-1.5 mt-4 px-3 py-1.5 rounded-lg text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                                Remove Logo
                            </button>
                        )}
                    </Card>
                )}

                {/* Daily Call Quotas */}
                {isAdmin && (
                    <Card>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 rounded-lg bg-green-500/20">
                                <PhoneOutgoing className="w-5 h-5 text-green-400" />
                            </div>
                            <div>
                                <h3 className="font-semibold">Daily Call Quotas</h3>
                                <p className="text-xs text-gray-400 mt-0.5">Minimum calls per day for each advisor</p>
                            </div>
                        </div>

                        {isLoading ? (
                            <div className="flex justify-center py-8">
                                <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                            </div>
                        ) : advisors.length === 0 ? (
                            <p className="text-sm text-gray-400 py-4">No active advisors found.</p>
                        ) : (
                            <div className="space-y-3">
                                {advisors.map((advisor) => (
                                    <div
                                        key={advisor.id}
                                        className="flex items-center justify-between p-3 rounded-xl bg-[hsl(222,47%,10%)] border border-[hsl(222,47%,18%)]"
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500/30 to-purple-500/30 border border-blue-500/20 flex items-center justify-center text-sm font-semibold text-blue-300 shrink-0">
                                                {advisor.displayName.charAt(0).toUpperCase()}
                                            </div>
                                            <span className="font-medium text-sm truncate">{advisor.displayName}</span>
                                        </div>

                                        <div className="flex items-center gap-2 shrink-0">
                                            {editingId === advisor.id ? (
                                                <div className="flex items-center gap-1.5">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max="100"
                                                        value={editValue}
                                                        onChange={(e) => setEditValue(e.target.value)}
                                                        className="w-16 px-2 py-1 rounded-lg bg-[hsl(222,47%,14%)] border border-[hsl(222,47%,25%)] text-white text-sm text-center focus:outline-none focus:border-blue-500/50"
                                                        autoFocus
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') {
                                                                const val = Math.max(0, parseInt(editValue) || 0);
                                                                handleSaveQuota(advisor.id, val);
                                                            } else if (e.key === 'Escape') {
                                                                setEditingId(null);
                                                            }
                                                        }}
                                                    />
                                                    <button
                                                        onClick={() => {
                                                            const val = Math.max(0, parseInt(editValue) || 0);
                                                            handleSaveQuota(advisor.id, val);
                                                        }}
                                                        disabled={savingId === advisor.id}
                                                        className="p-1 rounded-md bg-green-500/15 text-green-400 hover:bg-green-500/25 transition-colors"
                                                    >
                                                        {savingId === advisor.id ? (
                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                        ) : (
                                                            <Check className="w-4 h-4" />
                                                        )}
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2">
                                                    <span className="text-lg font-bold text-white min-w-[2ch] text-right">
                                                        {advisor.minimumDailyCalls}
                                                    </span>
                                                    <span className="text-xs text-gray-400">/day</span>
                                                    {savedId === advisor.id ? (
                                                        <Check className="w-4 h-4 text-green-400" />
                                                    ) : (
                                                        <button
                                                            onClick={() => {
                                                                setEditingId(advisor.id);
                                                                setEditValue(String(advisor.minimumDailyCalls));
                                                            }}
                                                            className="p-1 rounded-md text-gray-500 hover:text-gray-300 hover:bg-[hsl(222,47%,18%)] transition-colors"
                                                        >
                                                            <Edit3 className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>
                )}

                {/* Call Outcome Categories */}
                {isAdmin && (
                    <CallOutcomesCard />
                )}

                {/* Daily Call List Settings */}
                <Card>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 rounded-lg bg-orange-500/20">
                            <Bell className="w-5 h-5 text-orange-400" />
                        </div>
                        <h3 className="font-semibold">Daily Call List</h3>
                    </div>
                    <div className="space-y-4">
                        <Input
                            label="Days Since Last Contact Threshold"
                            type="number"
                            defaultValue="5"
                            disabled
                        />
                        <p className="text-sm text-gray-400">
                            Leads not contacted within this many days will appear on the daily call list.
                            <br />
                            <span className="text-yellow-400">Note: This value is configured in the codebase per blueprint spec.</span>
                        </p>
                    </div>
                </Card>

                {/* Import Settings */}
                <Card>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 rounded-lg bg-green-500/20">
                            <Database className="w-5 h-5 text-green-400" />
                        </div>
                        <div>
                            <h3 className="font-semibold">Import Settings</h3>
                            <p className="text-xs text-gray-400 mt-0.5">Columns are auto-detected by header name</p>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <p className="text-sm text-gray-300 mb-2">Default Import Source</p>
                            <p className="font-medium">master_leads_list</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-300 mb-2">Column Detection</p>
                            <p className="text-sm text-gray-400 mb-3">
                                The importer scans your spreadsheet&apos;s header row and matches columns by name — the column position doesn&apos;t matter.
                            </p>
                            <div className="space-y-2">
                                {[
                                    { label: 'Full Name', keywords: 'name, full name' },
                                    { label: 'First Name', keywords: 'first name, firstname' },
                                    { label: 'Last Name', keywords: 'last name, lastname' },
                                    { label: 'Phone', keywords: 'phone, mobile, cell' },
                                    { label: 'Email', keywords: 'email, e-mail' },
                                    { label: 'Advisor', keywords: 'advisor, assigned to, loan officer, lo, rep' },
                                    { label: 'Date', keywords: 'date, created, date of entry' },
                                    { label: 'Loan Product', keywords: 'loan product, loan type, product' },
                                    { label: 'Source', keywords: 'source, lead source, origin' },
                                    { label: 'Notes', keywords: 'notes, comments, remarks' },
                                ].map(({ label, keywords }) => (
                                    <div key={label} className="flex items-start gap-2 text-xs">
                                        <span className="text-gray-200 font-medium w-24 shrink-0">{label}</span>
                                        <span className="text-gray-500">→</span>
                                        <span className="text-gray-400 italic">{keywords}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div>
                            <p className="text-sm text-gray-300 mb-2">Deduplication Strategy</p>
                            <p className="font-medium">Email → Phone → External Row ID</p>
                        </div>
                    </div>
                </Card>

                {/* Security Settings */}
                <Card>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 rounded-lg bg-purple-500/20">
                            <Shield className="w-5 h-5 text-purple-400" />
                        </div>
                        <h3 className="font-semibold">Security & Compliance</h3>
                    </div>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between py-2">
                            <div>
                                <p className="font-medium">Role-Based Access Control</p>
                                <p className="text-sm text-gray-400">Advisors can only view assigned leads</p>
                            </div>
                            <span className="text-green-400 text-sm">Enabled</span>
                        </div>
                        <div className="flex items-center justify-between py-2">
                            <div>
                                <p className="font-medium">Audit Logging</p>
                                <p className="text-sm text-gray-400">Track all lead changes</p>
                            </div>
                            <span className="text-green-400 text-sm">Enabled</span>
                        </div>
                        <div className="flex items-center justify-between py-2">
                            <div>
                                <p className="font-medium">Do Not Contact Enforcement</p>
                                <p className="text-sm text-gray-400">Prevent contacting DNC flagged leads</p>
                            </div>
                            <span className="text-green-400 text-sm">Enabled</span>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Status Configuration Reference */}
            <Card className="mt-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-cyan-500/20">
                        <Palette className="w-5 h-5 text-cyan-400" />
                    </div>
                    <h3 className="font-semibold">Status Configuration</h3>
                </div>
                <p className="text-sm text-gray-400 mb-4">
                    Lead status flow is configured per the blueprint specification. Terminal statuses are:
                </p>
                <div className="flex flex-wrap gap-2">
                    {['CLOSED_FUNDED', 'NOT_INTERESTED', 'UNQUALIFIED', 'LOST', 'DO_NOT_CONTACT'].map(status => (
                        <span key={status} className="px-3 py-1 rounded-full bg-gray-500/20 text-gray-300 text-sm">
                            {status}
                        </span>
                    ))}
                </div>
            </Card>
        </>
    );
}

// ── Call Outcome Categories Card ──
function CallOutcomesCard() {
    const { outcomes: currentOutcomes, refresh } = useCallOutcomes();
    const [outcomes, setOutcomes] = useState<CallOutcomeOption[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle');
    const [showAddForm, setShowAddForm] = useState(false);
    const [newLabel, setNewLabel] = useState('');
    const [newCategory, setNewCategory] = useState<'positive' | 'neutral' | 'negative'>('neutral');
    const [newCountsAsContact, setNewCountsAsContact] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchOutcomes();
    }, []);

    const fetchOutcomes = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/settings/call-outcomes');
            const data = await res.json();
            setOutcomes(data.data || []);
        } catch {
            setOutcomes([]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        setSaveStatus('idle');
        try {
            const res = await fetch('/api/settings/call-outcomes', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ outcomes }),
            });
            if (res.ok) {
                setSaveStatus('saved');
                invalidateCallOutcomesCache();
                refresh();
                setTimeout(() => setSaveStatus('idle'), 2500);
            } else {
                setSaveStatus('error');
            }
        } catch {
            setSaveStatus('error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleAdd = () => {
        if (!newLabel.trim()) return;
        const id = newLabel.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_');
        const newOutcome: CallOutcomeOption = {
            id,
            label: newLabel.trim(),
            category: newCategory,
            countsAsContact: newCountsAsContact,
            active: true,
            sortOrder: outcomes.length,
        };
        setOutcomes([...outcomes, newOutcome]);
        setNewLabel('');
        setNewCategory('neutral');
        setNewCountsAsContact(false);
        setShowAddForm(false);
    };

    const handleToggleActive = (id: string) => {
        setOutcomes(outcomes.map(o =>
            o.id === id ? { ...o, active: !o.active } : o
        ));
    };

    const handleToggleContact = (id: string) => {
        setOutcomes(outcomes.map(o =>
            o.id === id ? { ...o, countsAsContact: !o.countsAsContact } : o
        ));
    };

    const handleChangeCategory = (id: string, category: 'positive' | 'neutral' | 'negative') => {
        setOutcomes(outcomes.map(o =>
            o.id === id ? { ...o, category } : o
        ));
    };

    const handleRemove = (id: string) => {
        setOutcomes(outcomes.filter(o => o.id !== id));
    };

    const categoryConfig = {
        positive: { label: 'Positive', color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20', icon: '✅' },
        neutral: { label: 'Neutral', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', icon: '⚪' },
        negative: { label: 'Negative', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', icon: '❌' },
    };

    const hasChanges = JSON.stringify(outcomes) !== JSON.stringify(currentOutcomes);

    return (
        <Card>
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-orange-500/20">
                        <Phone className="w-5 h-5 text-orange-400" />
                    </div>
                    <div>
                        <h3 className="font-semibold">Call Outcome Categories</h3>
                        <p className="text-xs text-gray-400 mt-0.5">Configure outcomes shown when logging calls</p>
                    </div>
                </div>
                {hasChanges && (
                    <Button onClick={handleSave} isLoading={isSaving} size="sm">
                        <Save className="w-4 h-4" />
                        Save
                    </Button>
                )}
            </div>

            {/* Save status */}
            {saveStatus === 'saved' && (
                <p className="text-sm text-green-400 mb-3 flex items-center gap-1">
                    <Check className="w-4 h-4" /> Outcomes saved successfully
                </p>
            )}
            {saveStatus === 'error' && (
                <p className="text-sm text-red-400 mb-3">Failed to save outcomes. Please try again.</p>
            )}

            {isLoading ? (
                <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                </div>
            ) : (
                <div className="space-y-4">
                    {/* Outcomes list grouped by category */}
                    {(['positive', 'neutral', 'negative'] as const).map(cat => {
                        const items = outcomes.filter(o => o.category === cat);
                        if (items.length === 0) return null;
                        const config = categoryConfig[cat];
                        return (
                            <div key={cat}>
                                <p className={`text-xs font-semibold uppercase tracking-wider mb-2 ${config.color}`}>
                                    {config.icon} {config.label}
                                </p>
                                <div className="space-y-1.5">
                                    {items.map(outcome => (
                                        <div
                                            key={outcome.id}
                                            className={`flex items-center gap-2 p-2.5 rounded-lg ${config.bg} border ${config.border} ${!outcome.active ? 'opacity-40' : ''}`}
                                        >
                                            <GripVertical className="w-3.5 h-3.5 text-gray-600 shrink-0" />
                                            <span className="flex-1 text-sm font-medium truncate">{outcome.label}</span>

                                            {/* Counts as contact indicator */}
                                            <button
                                                onClick={() => handleToggleContact(outcome.id)}
                                                className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${outcome.countsAsContact
                                                    ? 'bg-green-500/15 border-green-500/30 text-green-300'
                                                    : 'bg-gray-500/10 border-gray-600 text-gray-500'
                                                    }`}
                                                title={outcome.countsAsContact ? 'Counts as contact — click to change' : 'Does not count as contact — click to change'}
                                            >
                                                {outcome.countsAsContact ? 'Contact' : 'No contact'}
                                            </button>

                                            {/* Category selector */}
                                            <select
                                                value={outcome.category}
                                                onChange={(e) => handleChangeCategory(outcome.id, e.target.value as any)}
                                                className="text-xs bg-transparent border border-gray-700 rounded px-1.5 py-0.5 text-gray-300"
                                            >
                                                <option value="positive">Positive</option>
                                                <option value="neutral">Neutral</option>
                                                <option value="negative">Negative</option>
                                            </select>

                                            {/* Toggle active */}
                                            <button
                                                onClick={() => handleToggleActive(outcome.id)}
                                                className={`text-xs px-2 py-0.5 rounded transition-colors ${outcome.active
                                                    ? 'text-gray-400 hover:text-yellow-400'
                                                    : 'text-yellow-400 hover:text-green-400'
                                                    }`}
                                                title={outcome.active ? 'Click to deactivate' : 'Click to activate'}
                                            >
                                                {outcome.active ? 'Active' : 'Inactive'}
                                            </button>

                                            {/* Delete */}
                                            <button
                                                onClick={() => handleRemove(outcome.id)}
                                                className="p-1 text-gray-600 hover:text-red-400 transition-colors"
                                                title="Remove outcome"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}

                    {/* Add new outcome */}
                    {showAddForm ? (
                        <div className="p-4 rounded-xl bg-[hsl(222,47%,10%)] border border-[hsl(222,47%,20%)] space-y-3">
                            <p className="text-sm font-medium text-gray-200">Add New Outcome</p>
                            <Input
                                label="Label"
                                placeholder="e.g., Connected – Scheduled Callback"
                                value={newLabel}
                                onChange={(e) => setNewLabel(e.target.value)}
                            />
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="label">Category</label>
                                    <select
                                        className="input text-sm"
                                        value={newCategory}
                                        onChange={(e) => setNewCategory(e.target.value as any)}
                                    >
                                        <option value="positive">✅ Positive</option>
                                        <option value="neutral">⚪ Neutral</option>
                                        <option value="negative">❌ Negative</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="label">Counts as Contact?</label>
                                    <label className="flex items-center gap-2 mt-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={newCountsAsContact}
                                            onChange={(e) => setNewCountsAsContact(e.target.checked)}
                                            className="w-4 h-4 rounded"
                                        />
                                        <span className="text-sm text-gray-300">
                                            {newCountsAsContact ? 'Yes' : 'No'}
                                        </span>
                                    </label>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button onClick={handleAdd} disabled={!newLabel.trim()} size="sm">
                                    <Plus className="w-4 h-4" />
                                    Add
                                </Button>
                                <Button variant="ghost" onClick={() => setShowAddForm(false)} size="sm">
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <button
                            onClick={() => setShowAddForm(true)}
                            className="flex items-center gap-2 w-full px-4 py-3 rounded-xl border-2 border-dashed border-[hsl(222,47%,22%)] text-gray-400 hover:border-orange-500/30 hover:text-orange-400 transition-colors text-sm"
                        >
                            <Plus className="w-4 h-4" />
                            Add Outcome
                        </button>
                    )}

                    {/* Legend */}
                    <div className="pt-3 border-t border-[hsl(222,47%,18%)]">
                        <p className="text-xs text-gray-500">
                            <strong>Contact</strong> = Updates &quot;Last Contacted&quot; timestamp when selected.
                            <strong className="ml-2">No contact</strong> = Only counts as an attempt.
                        </p>
                    </div>
                </div>
            )}
        </Card>
    );
}
