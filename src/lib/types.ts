// Prime Loan Advisors CRM - Type Definitions

import { LeadStatusType, PriorityType } from './constants';

// === USER TYPES ===

export interface User {
    id: string;
    role: 'admin' | 'advisor';
    displayName: string;
    email: string;
    active: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface UserWithPassword extends User {
    password: string;
}

// === LEAD TYPES ===

export interface Lead {
    id: string;
    externalSource: string;
    externalRowId: string | null;
    assignedAdvisorUserId: string | null;
    assignedAdvisor?: User | null;

    // Contact
    firstName: string | null;
    lastName: string | null;
    fullName: string | null;
    phonePrimary: string | null;
    emailPrimary: string | null;

    // Pipeline
    status: LeadStatusType;
    statusUpdatedAt: string | null;

    // Follow-up
    lastContactedAt: string | null;
    nextActionAt: string | null;
    priority: PriorityType;

    // Compliance
    doNotCall: boolean;
    doNotText: boolean;
    doNotEmail: boolean;
    consentSms: boolean | null;
    consentCall: boolean | null;
    optOutAt: string | null;

    // Raw import
    rawImportPayload: Record<string, unknown> | null;
    rawImportHash: string | null;

    // Timestamps
    createdAt: string;
    updatedAt: string;

    // Relations
    interactions?: Interaction[];
}

export interface LeadSummary {
    id: string;
    fullName: string | null;
    firstName: string | null;
    lastName: string | null;
    phonePrimary: string | null;
    emailPrimary: string | null;
    status: LeadStatusType;
    priority: PriorityType;
    lastContactedAt: string | null;
    nextActionAt: string | null;
    assignedAdvisor?: { displayName: string } | null;
}

// === INTERACTION TYPES ===

export type InteractionType = 'call' | 'text' | 'email' | 'note' | 'status_change' | 'assignment_change';
export type InteractionDirection = 'outbound' | 'inbound' | 'internal';

export interface Interaction {
    id: string;
    leadId: string;
    userId: string;
    user?: User;
    type: InteractionType;
    direction: InteractionDirection | null;
    outcome: string | null;
    summary: string | null;
    body: string | null;
    occurredAt: string;
    metadata: Record<string, unknown> | null;
    createdAt: string;
}

export interface CreateInteractionInput {
    leadId: string;
    type: InteractionType;
    direction?: InteractionDirection;
    outcome?: string;
    summary?: string;
    body?: string;
    metadata?: Record<string, unknown>;
}

// === IMPORT TYPES ===

export interface Import {
    id: string;
    sourceName: string;
    sheetName: string;
    startedAt: string;
    completedAt: string | null;
    rowsProcessed: number;
    rowsInserted: number;
    rowsUpdated: number;
    rowsFailed: number;
    errorLog: ImportError[] | null;
}

export interface ImportError {
    rowIndex: number;
    errorType: string;
    values: Record<string, unknown>;
    message: string;
}

// === AUDIT LOG TYPES ===

export interface AuditLog {
    id: string;
    actorUserId: string | null;
    actor?: User | null;
    entityType: 'lead' | 'user' | 'import';
    entityId: string;
    action: string;
    before: Record<string, unknown> | null;
    after: Record<string, unknown> | null;
    occurredAt: string;
}

// === API TYPES ===

export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

export interface LeadFilters {
    status?: LeadStatusType | LeadStatusType[];
    priority?: PriorityType;
    assignedAdvisorUserId?: string;
    search?: string;
    callListOnly?: boolean;
}

export interface LeadSort {
    field: 'createdAt' | 'updatedAt' | 'lastContactedAt' | 'nextActionAt' | 'status' | 'priority' | 'fullName';
    direction: 'asc' | 'desc';
}

// === DASHBOARD TYPES ===

export interface DashboardStats {
    totalLeads: number;
    newLeads: number;
    activeLeads: number;
    closedLeads: number;
    callListCount: number;
    contactedToday: number;
    statusCounts: Record<LeadStatusType, number>;
}

export interface AdvisorStats {
    advisorId: string;
    advisorName: string;
    totalLeads: number;
    callListCount: number;
    contactedToday: number;
    contactedThisWeek: number;
}
