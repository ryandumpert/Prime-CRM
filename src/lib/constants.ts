// Prime Loan Advisors CRM - Constants
// Based on blueprint.md specifications

// === LEAD STATUS FLOW ===
// Exact strings from blueprint.md

export const LEAD_STATUSES = [
    'NEW',
    'ATTEMPTED_CONTACT',
    'CONTACTED',
    'PREQUAL_IN_PROGRESS',
    'DOCS_REQUESTED',
    'DOCS_RECEIVED',
    'SUBMITTED_TO_LENDER',
    'UNDERWRITING',
    'CONDITIONAL_APPROVAL',
    'CLEAR_TO_CLOSE',
    'CLOSED_FUNDED',
    'NOT_INTERESTED',
    'UNQUALIFIED',
    'LOST',
    'DO_NOT_CONTACT',
] as const;

export type LeadStatusType = typeof LEAD_STATUSES[number];

// Terminal statuses - do not appear in daily call list
export const TERMINAL_STATUSES: LeadStatusType[] = [
    'CLOSED_FUNDED',
    'NOT_INTERESTED',
    'UNQUALIFIED',
    'LOST',
    'DO_NOT_CONTACT',
];

// Status display labels
export const STATUS_LABELS: Record<LeadStatusType, string> = {
    NEW: 'New',
    ATTEMPTED_CONTACT: 'Attempted Contact',
    CONTACTED: 'Contacted',
    PREQUAL_IN_PROGRESS: 'Pre-Qual In Progress',
    DOCS_REQUESTED: 'Docs Requested',
    DOCS_RECEIVED: 'Docs Received',
    SUBMITTED_TO_LENDER: 'Submitted to Lender',
    UNDERWRITING: 'Underwriting',
    CONDITIONAL_APPROVAL: 'Conditional Approval',
    CLEAR_TO_CLOSE: 'Clear to Close',
    CLOSED_FUNDED: 'Closed/Funded',
    NOT_INTERESTED: 'Not Interested',
    UNQUALIFIED: 'Unqualified',
    LOST: 'Lost',
    DO_NOT_CONTACT: 'Do Not Contact',
};

// Status colors for UI
export const STATUS_COLORS: Record<LeadStatusType, { bg: string; text: string; border: string }> = {
    NEW: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30' },
    ATTEMPTED_CONTACT: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30' },
    CONTACTED: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30' },
    PREQUAL_IN_PROGRESS: { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/30' },
    DOCS_REQUESTED: { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/30' },
    DOCS_RECEIVED: { bg: 'bg-teal-500/20', text: 'text-teal-400', border: 'border-teal-500/30' },
    SUBMITTED_TO_LENDER: { bg: 'bg-cyan-500/20', text: 'text-cyan-400', border: 'border-cyan-500/30' },
    UNDERWRITING: { bg: 'bg-indigo-500/20', text: 'text-indigo-400', border: 'border-indigo-500/30' },
    CONDITIONAL_APPROVAL: { bg: 'bg-lime-500/20', text: 'text-lime-400', border: 'border-lime-500/30' },
    CLEAR_TO_CLOSE: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30' },
    CLOSED_FUNDED: { bg: 'bg-green-600/20', text: 'text-green-300', border: 'border-green-600/30' },
    NOT_INTERESTED: { bg: 'bg-gray-500/20', text: 'text-gray-300', border: 'border-gray-500/30' },
    UNQUALIFIED: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' },
    LOST: { bg: 'bg-rose-500/20', text: 'text-rose-400', border: 'border-rose-500/30' },
    DO_NOT_CONTACT: { bg: 'bg-slate-600/20', text: 'text-slate-400', border: 'border-slate-600/30' },
};

// === STATUS TRANSITION RULES ===
// Per blueprint.md: Allowed Transitions

export const ALLOWED_TRANSITIONS: Record<LeadStatusType, LeadStatusType[]> = {
    NEW: ['ATTEMPTED_CONTACT', 'CONTACTED', 'DO_NOT_CONTACT'],
    ATTEMPTED_CONTACT: ['ATTEMPTED_CONTACT', 'CONTACTED', 'NOT_INTERESTED', 'UNQUALIFIED', 'DO_NOT_CONTACT'],
    CONTACTED: ['PREQUAL_IN_PROGRESS', 'NOT_INTERESTED', 'UNQUALIFIED', 'DO_NOT_CONTACT'],
    PREQUAL_IN_PROGRESS: ['DOCS_REQUESTED', 'UNQUALIFIED', 'LOST', 'DO_NOT_CONTACT'],
    DOCS_REQUESTED: ['DOCS_RECEIVED', 'LOST', 'DO_NOT_CONTACT'],
    DOCS_RECEIVED: ['SUBMITTED_TO_LENDER', 'LOST', 'DO_NOT_CONTACT'],
    SUBMITTED_TO_LENDER: ['UNDERWRITING', 'LOST'],
    UNDERWRITING: ['CONDITIONAL_APPROVAL', 'LOST'],
    CONDITIONAL_APPROVAL: ['CLEAR_TO_CLOSE', 'LOST'],
    CLEAR_TO_CLOSE: ['CLOSED_FUNDED', 'LOST'],
    // Terminal statuses - no transitions (except admin override)
    CLOSED_FUNDED: [],
    NOT_INTERESTED: [],
    UNQUALIFIED: [],
    LOST: [],
    DO_NOT_CONTACT: [],
};

// Check if status transition is valid
export function isValidTransition(from: LeadStatusType, to: LeadStatusType): boolean {
    return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

// === INTERACTION OUTCOMES ===
// Per blueprint.md: Outcome enums

export const CALL_OUTCOMES = [
    'attempted',
    'connected',
    'left_voicemail',
    'no_answer',
    'wrong_number',
] as const;

export const TEXT_OUTCOMES = [
    'sent',
    'delivered',
    'failed',
    'inbound_reply',
] as const;

export const EMAIL_OUTCOMES = [
    'sent',
    'bounced',
    'opened',
    'inbound_reply',
] as const;

export type CallOutcome = typeof CALL_OUTCOMES[number];
export type TextOutcome = typeof TEXT_OUTCOMES[number];
export type EmailOutcome = typeof EMAIL_OUTCOMES[number];

// Outcome display labels
export const OUTCOME_LABELS: Record<string, string> = {
    attempted: 'Attempted',
    connected: 'Connected',
    left_voicemail: 'Left Voicemail',
    no_answer: 'No Answer',
    wrong_number: 'Wrong Number',
    sent: 'Sent',
    delivered: 'Delivered',
    failed: 'Failed',
    inbound_reply: 'Inbound Reply',
    bounced: 'Bounced',
    opened: 'Opened',
};

// === CONTACT SEMANTICS ===
// Per blueprint.md: What updates last_contacted_at

// Outcomes that update last_contacted_at
export const CONTACT_OUTCOMES = {
    call: ['connected', 'left_voicemail'],
    text: ['sent', 'inbound_reply'],
    email: ['sent', 'inbound_reply'],
};

// Check if interaction should update last_contacted_at
export function shouldUpdateLastContacted(
    type: 'call' | 'text' | 'email' | 'note' | 'status_change' | 'assignment_change',
    outcome?: string
): boolean {
    if (type === 'note' || type === 'status_change' || type === 'assignment_change') {
        return false;
    }

    if (!outcome) return false;

    const validOutcomes = CONTACT_OUTCOMES[type as keyof typeof CONTACT_OUTCOMES];
    return validOutcomes?.includes(outcome) ?? false;
}

// === PRIORITY ===

export const PRIORITIES = ['low', 'normal', 'high'] as const;
export type PriorityType = typeof PRIORITIES[number];

export const PRIORITY_LABELS: Record<PriorityType, string> = {
    low: 'Low',
    normal: 'Normal',
    high: 'High',
};

export const PRIORITY_COLORS: Record<PriorityType, { bg: string; text: string }> = {
    low: { bg: 'bg-slate-500/20', text: 'text-slate-400' },
    normal: { bg: 'bg-blue-500/20', text: 'text-blue-400' },
    high: { bg: 'bg-red-500/20', text: 'text-red-400' },
};

// === DAILY CALL LIST ===
// Per blueprint.md: leads not contacted in last 5 days

export const CALL_LIST_DAYS_THRESHOLD = 5;

// === IMPORT ===

export const DEFAULT_IMPORT_SOURCE = 'master_leads_list';
export const DEFAULT_SHEET_NAME = 'Sheet1';
// Header matching patterns (case/whitespace-insensitive)
export const HEADER_PATTERNS = {
    firstName: ['first name', 'firstname', 'first_name', 'fist name'],
    lastName: ['last name', 'lastname', 'last_name'],
    fullName: ['name', 'full name', 'fullname', 'full_name'],
    phone: ['phone', 'mobile', 'cell', 'primary phone', 'phone number', 'phonenumber'],
    email: ['email', 'email address', 'emailaddress', 'e-mail'],
    date: ['date', 'created', 'lead date', 'created_at', 'createdat', 'date of entry', 'dateofentry', 'date entry', 'entry date'],
    advisor: ['advisor', 'assigned advisor', 'loan officer', 'lo', 'advisor name', 'assigned to', 'rep', 'loan advisor', 'assigned advisor name'],
    loanProduct: ['loan product', 'loanproduct', 'loan_product', 'loan type', 'loantype', 'loan_type', 'product', 'product type'],
    source: ['source', 'lead source', 'leadsource', 'lead_source', 'referral source', 'origin'],
    notes: ['notes', 'note', 'comments', 'comment', 'remarks', 'remark'],
};

// === PIPELINES ===

export const PIPELINES = ['cold_leads', 'warm_leads', 'processing'] as const;
export type PipelineType = typeof PIPELINES[number];

export const PIPELINE_LABELS: Record<PipelineType, string> = {
    cold_leads: 'Cold Leads',
    warm_leads: 'Warm Leads',
    processing: 'Processing',
};

export const PIPELINE_DESCRIPTIONS: Record<PipelineType, string> = {
    cold_leads: 'Outreach & daily call list',
    warm_leads: 'Active cultivation',
    processing: 'Loan lifecycle',
};

export const PIPELINE_COLORS: Record<PipelineType, { bg: string; text: string; border: string; accent: string }> = {
    cold_leads: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30', accent: '#3b82f6' },
    warm_leads: { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/30', accent: '#f97316' },
    processing: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30', accent: '#10b981' },
};

// Which statuses appear as columns in each pipeline's Kanban board
export const PIPELINE_STATUSES: Record<PipelineType, LeadStatusType[]> = {
    cold_leads: ['NEW', 'ATTEMPTED_CONTACT', 'CONTACTED'],
    warm_leads: ['CONTACTED', 'PREQUAL_IN_PROGRESS', 'DOCS_REQUESTED', 'DOCS_RECEIVED'],
    processing: ['SUBMITTED_TO_LENDER', 'UNDERWRITING', 'CONDITIONAL_APPROVAL', 'CLEAR_TO_CLOSE', 'CLOSED_FUNDED'],
};

// Which pipelines a lead can be transferred TO from a given pipeline
export const PIPELINE_TRANSFERS: Record<PipelineType, PipelineType[]> = {
    cold_leads: ['warm_leads'],
    warm_leads: ['cold_leads', 'processing'],
    processing: ['warm_leads', 'cold_leads'],
};

// Default status when transferring INTO a pipeline
export const PIPELINE_ENTRY_STATUS: Record<PipelineType, LeadStatusType> = {
    cold_leads: 'NEW',
    warm_leads: 'CONTACTED',
    processing: 'SUBMITTED_TO_LENDER',
};

// Derive which pipeline a status naturally belongs to (used for backfill migration)
export function getDefaultPipelineForStatus(status: LeadStatusType): PipelineType | null {
    if (['NEW', 'ATTEMPTED_CONTACT'].includes(status)) return 'cold_leads';
    if (['CONTACTED', 'PREQUAL_IN_PROGRESS', 'DOCS_REQUESTED', 'DOCS_RECEIVED'].includes(status)) return 'warm_leads';
    if (['SUBMITTED_TO_LENDER', 'UNDERWRITING', 'CONDITIONAL_APPROVAL', 'CLEAR_TO_CLOSE', 'CLOSED_FUNDED'].includes(status)) return 'processing';
    // Terminal statuses return null (they're in whatever pipeline they were in before)
    return null;
}

// Check if a status is valid for a given pipeline
export function isStatusValidForPipeline(status: LeadStatusType, pipeline: PipelineType): boolean {
    return PIPELINE_STATUSES[pipeline].includes(status);
}

