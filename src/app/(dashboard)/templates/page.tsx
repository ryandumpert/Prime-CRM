'use client';

import { useState, useEffect, useCallback } from 'react';
import { Header } from '@/components/layout';
import { Card, Button, Input, Select } from '@/components/ui';
import { Modal } from '@/components/ui/modal';
import {
    FileText,
    Plus,
    Edit3,
    Trash2,
    ToggleLeft,
    ToggleRight,
    Mail,
    MessageSquare,
    Layers,
    ChevronDown,
    ChevronRight,
    Copy,
    Info,
} from 'lucide-react';

interface Template {
    id: string;
    name: string;
    category: string;
    type: string;
    subject: string | null;
    body: string;
    active: boolean;
    sortOrder: number;
    createdAt: string;
}

const CATEGORIES = [
    { value: 'initial_outreach', label: 'Initial Outreach', color: 'bg-blue-500/20 text-blue-400', description: 'First contact with new leads' },
    { value: 'follow_up', label: 'Follow-Up', color: 'bg-orange-500/20 text-orange-400', description: 'Following up after initial contact' },
    { value: 'doc_request', label: 'Document Request', color: 'bg-green-500/20 text-green-400', description: 'Requesting docs from leads' },
    { value: 'rate_quote', label: 'Rate Quote', color: 'bg-purple-500/20 text-purple-400', description: 'Sharing rate quotes and pricing' },
    { value: 'general', label: 'General', color: 'bg-gray-500/20 text-gray-400', description: 'General purpose templates' },
];

const TYPES = [
    { value: 'text', label: 'Text Only', icon: MessageSquare },
    { value: 'email', label: 'Email Only', icon: Mail },
    { value: 'both', label: 'Text & Email', icon: Layers },
];

const VARIABLES = [
    { key: '{{firstName}}', description: 'Lead first name' },
    { key: '{{lastName}}', description: 'Lead last name' },
    { key: '{{fullName}}', description: 'Lead full name' },
    { key: '{{advisorName}}', description: 'Your display name' },
    { key: '{{companyName}}', description: 'Company name' },
    { key: '{{loanProduct}}', description: 'Loan product type' },
];

export default function TemplatesPage() {
    const [templates, setTemplates] = useState<Template[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
    const [showInactive, setShowInactive] = useState(false);
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(CATEGORIES.map(c => c.value)));
    const [showVariableHelp, setShowVariableHelp] = useState(false);

    // Form states
    const [formName, setFormName] = useState('');
    const [formCategory, setFormCategory] = useState('initial_outreach');
    const [formType, setFormType] = useState('both');
    const [formSubject, setFormSubject] = useState('');
    const [formBody, setFormBody] = useState('');
    const [formSortOrder, setFormSortOrder] = useState(0);
    const [saving, setSaving] = useState(false);

    const fetchTemplates = useCallback(async () => {
        try {
            const res = await fetch(`/api/templates?active=${showInactive ? 'false' : 'true'}`);
            if (res.ok) {
                const data = await res.json();
                setTemplates(data.data);
            }
        } catch (error) {
            console.error('Error fetching templates:', error);
        } finally {
            setLoading(false);
        }
    }, [showInactive]);

    useEffect(() => {
        fetchTemplates();
    }, [fetchTemplates]);

    const openCreateModal = () => {
        setEditingTemplate(null);
        setFormName('');
        setFormCategory('initial_outreach');
        setFormType('both');
        setFormSubject('');
        setFormBody('');
        setFormSortOrder(0);
        setShowModal(true);
    };

    const openEditModal = (template: Template) => {
        setEditingTemplate(template);
        setFormName(template.name);
        setFormCategory(template.category);
        setFormType(template.type);
        setFormSubject(template.subject || '');
        setFormBody(template.body);
        setFormSortOrder(template.sortOrder);
        setShowModal(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        try {
            const payload = {
                name: formName,
                category: formCategory,
                type: formType,
                subject: formSubject || null,
                body: formBody,
                sortOrder: formSortOrder,
            };

            let res;
            if (editingTemplate) {
                res = await fetch(`/api/templates/${editingTemplate.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });
            } else {
                res = await fetch('/api/templates', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });
            }

            if (res.ok) {
                setShowModal(false);
                fetchTemplates();
            }
        } catch (error) {
            console.error('Error saving template:', error);
        } finally {
            setSaving(false);
        }
    };

    const handleToggleActive = async (template: Template) => {
        try {
            await fetch(`/api/templates/${template.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ active: !template.active }),
            });
            fetchTemplates();
        } catch (error) {
            console.error('Error toggling template:', error);
        }
    };

    const handleDelete = async (template: Template) => {
        if (!confirm(`Delete "${template.name}"? This cannot be undone.`)) return;
        try {
            await fetch(`/api/templates/${template.id}`, { method: 'DELETE' });
            fetchTemplates();
        } catch (error) {
            console.error('Error deleting template:', error);
        }
    };

    const toggleCategory = (category: string) => {
        setExpandedCategories(prev => {
            const next = new Set(prev);
            if (next.has(category)) {
                next.delete(category);
            } else {
                next.add(category);
            }
            return next;
        });
    };

    const getTemplatesByCategory = (category: string) => {
        return templates.filter(t => t.category === category);
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'text': return <MessageSquare className="w-3.5 h-3.5" />;
            case 'email': return <Mail className="w-3.5 h-3.5" />;
            case 'both': return <Layers className="w-3.5 h-3.5" />;
            default: return null;
        }
    };

    const getTypeLabel = (type: string) => {
        return TYPES.find(t => t.value === type)?.label || type;
    };

    return (
        <>
            <Header
                title="Message Templates"
                subtitle="Pre-built templates for emails and text messages"
            />

            {/* Top Controls */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowInactive(!showInactive)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm border transition-colors ${showInactive
                                ? 'border-yellow-500/40 bg-yellow-500/10 text-yellow-400'
                                : 'border-gray-600 text-gray-400 hover:border-gray-400'
                            }`}
                    >
                        {showInactive ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                        {showInactive ? 'Showing All' : 'Active Only'}
                    </button>
                    <span className="text-sm text-gray-400">
                        {templates.length} template{templates.length !== 1 ? 's' : ''}
                    </span>
                </div>
                <Button onClick={openCreateModal}>
                    <Plus className="w-4 h-4" />
                    New Template
                </Button>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
                </div>
            ) : templates.length === 0 ? (
                <Card>
                    <div className="text-center py-12">
                        <FileText className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-300 mb-2">No templates yet</h3>
                        <p className="text-gray-400 mb-6 max-w-md mx-auto">
                            Create message templates for common scenarios like initial outreach,
                            follow-ups, document requests, and rate quotes.
                        </p>
                        <Button onClick={openCreateModal}>
                            <Plus className="w-4 h-4" />
                            Create Your First Template
                        </Button>
                    </div>
                </Card>
            ) : (
                <div className="space-y-4">
                    {CATEGORIES.map(cat => {
                        const categoryTemplates = getTemplatesByCategory(cat.value);
                        if (categoryTemplates.length === 0) return null;
                        const isExpanded = expandedCategories.has(cat.value);

                        return (
                            <Card key={cat.value}>
                                <button
                                    onClick={() => toggleCategory(cat.value)}
                                    className="w-full flex items-center justify-between"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${cat.color.split(' ')[0]}`}>
                                            <FileText className={`w-4 h-4 ${cat.color.split(' ')[1]}`} />
                                        </div>
                                        <div className="text-left">
                                            <h3 className="font-semibold text-white">{cat.label}</h3>
                                            <p className="text-xs text-gray-400">{cat.description}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-gray-400">{categoryTemplates.length}</span>
                                        {isExpanded ? (
                                            <ChevronDown className="w-4 h-4 text-gray-400" />
                                        ) : (
                                            <ChevronRight className="w-4 h-4 text-gray-400" />
                                        )}
                                    </div>
                                </button>

                                {isExpanded && (
                                    <div className="mt-4 space-y-3">
                                        {categoryTemplates.map(template => (
                                            <div
                                                key={template.id}
                                                className={`p-4 rounded-xl border transition-colors ${template.active
                                                        ? 'border-gray-700 bg-[hsl(222,47%,11%)]'
                                                        : 'border-gray-700/50 bg-[hsl(222,47%,9%)] opacity-60'
                                                    }`}
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <h4 className="font-medium text-white truncate">{template.name}</h4>
                                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${template.type === 'text' ? 'bg-green-500/20 text-green-400' :
                                                                    template.type === 'email' ? 'bg-blue-500/20 text-blue-400' :
                                                                        'bg-purple-500/20 text-purple-400'
                                                                }`}>
                                                                {getTypeIcon(template.type)}
                                                                {getTypeLabel(template.type)}
                                                            </span>
                                                            {!template.active && (
                                                                <span className="px-2 py-0.5 rounded-full bg-gray-500/20 text-gray-400 text-xs">
                                                                    Inactive
                                                                </span>
                                                            )}
                                                        </div>
                                                        {template.subject && (
                                                            <p className="text-sm text-gray-300 mb-1">
                                                                <span className="text-gray-500">Subject:</span> {template.subject}
                                                            </p>
                                                        )}
                                                        <p className="text-sm text-gray-400 line-clamp-2">{template.body}</p>
                                                    </div>
                                                    <div className="flex items-center gap-1 shrink-0">
                                                        <button
                                                            onClick={() => handleToggleActive(template)}
                                                            className="p-1.5 rounded-lg hover:bg-gray-700/50 text-gray-400 hover:text-gray-200 transition-colors"
                                                            title={template.active ? 'Deactivate' : 'Activate'}
                                                        >
                                                            {template.active ? (
                                                                <ToggleRight className="w-4 h-4 text-green-400" />
                                                            ) : (
                                                                <ToggleLeft className="w-4 h-4" />
                                                            )}
                                                        </button>
                                                        <button
                                                            onClick={() => openEditModal(template)}
                                                            className="p-1.5 rounded-lg hover:bg-gray-700/50 text-gray-400 hover:text-gray-200 transition-colors"
                                                            title="Edit"
                                                        >
                                                            <Edit3 className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(template)}
                                                            className="p-1.5 rounded-lg hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors"
                                                            title="Delete"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Create / Edit Modal */}
            <Modal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                title={editingTemplate ? 'Edit Template' : 'Create Template'}
            >
                <form onSubmit={handleSave} className="space-y-4">
                    <Input
                        label="Template Name"
                        placeholder="e.g., Initial Outreach - DSCR"
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        required
                    />

                    <div className="grid grid-cols-2 gap-4">
                        <Select
                            label="Category"
                            options={CATEGORIES.map(c => ({ value: c.value, label: c.label }))}
                            value={formCategory}
                            onChange={(e) => setFormCategory(e.target.value)}
                        />
                        <Select
                            label="Type"
                            options={TYPES.map(t => ({ value: t.value, label: t.label }))}
                            value={formType}
                            onChange={(e) => setFormType(e.target.value)}
                        />
                    </div>

                    {(formType === 'email' || formType === 'both') && (
                        <Input
                            label="Email Subject Line"
                            placeholder="e.g., Your personalized rate quote from Prime"
                            value={formSubject}
                            onChange={(e) => setFormSubject(e.target.value)}
                        />
                    )}

                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <label className="label">Message Body</label>
                            <button
                                type="button"
                                onClick={() => setShowVariableHelp(!showVariableHelp)}
                                className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                            >
                                <Info className="w-3 h-3" />
                                Variables
                            </button>
                        </div>

                        {showVariableHelp && (
                            <div className="mb-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                                <p className="text-xs text-blue-300 mb-2">Use these variables in your template — they&apos;ll auto-fill when used:</p>
                                <div className="grid grid-cols-2 gap-1">
                                    {VARIABLES.map(v => (
                                        <button
                                            key={v.key}
                                            type="button"
                                            onClick={() => setFormBody(prev => prev + v.key)}
                                            className="flex items-center gap-1.5 px-2 py-1 rounded text-xs hover:bg-blue-500/20 transition-colors text-left"
                                        >
                                            <Copy className="w-3 h-3 text-blue-400 shrink-0" />
                                            <code className="text-blue-300">{v.key}</code>
                                            <span className="text-gray-400 truncate">– {v.description}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <textarea
                            className="input min-h-[140px] resize-y"
                            placeholder="Hi {{firstName}}, this is {{advisorName}} from Prime Loan Advisors..."
                            value={formBody}
                            onChange={(e) => setFormBody(e.target.value)}
                            required
                        />
                    </div>

                    <Input
                        label="Sort Order"
                        type="number"
                        value={formSortOrder.toString()}
                        onChange={(e) => setFormSortOrder(parseInt(e.target.value) || 0)}
                    />

                    <div className="flex justify-end gap-3 pt-2">
                        <Button type="button" variant="ghost" onClick={() => setShowModal(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" isLoading={saving}>
                            {editingTemplate ? 'Save Changes' : 'Create Template'}
                        </Button>
                    </div>
                </form>
            </Modal>
        </>
    );
}
