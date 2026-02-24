import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

// Phone number normalization to E.164 format
export function normalizePhone(phone: string | null | undefined): string | null {
    if (!phone) return null;

    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, '');

    // If it starts with 1 and is 11 digits, assume US
    if (digits.length === 11 && digits.startsWith('1')) {
        return `+${digits}`;
    }

    // If it's 10 digits, assume US and add +1
    if (digits.length === 10) {
        return `+1${digits}`;
    }

    // Return with + prefix if not already formatted
    return digits.length > 0 ? `+${digits}` : null;
}

// Email normalization
export function normalizeEmail(email: string | null | undefined): string | null {
    if (!email) return null;
    return email.toLowerCase().trim();
}

// Generate a hash for import deduplication
export function generateImportHash(payload: Record<string, unknown>): string {
    const sortedKeys = Object.keys(payload).sort();
    const sortedPayload: Record<string, unknown> = {};
    for (const key of sortedKeys) {
        sortedPayload[key] = payload[key];
    }
    // Simple hash using JSON stringification
    const jsonString = JSON.stringify(sortedPayload);
    let hash = 0;
    for (let i = 0; i < jsonString.length; i++) {
        const char = jsonString.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(16);
}

// Format phone for display
export function formatPhoneDisplay(phone: string | null): string {
    if (!phone) return 'N/A';

    // Remove +1 prefix for US numbers
    const digits = phone.replace(/\D/g, '');
    const nationalNumber = digits.startsWith('1') ? digits.slice(1) : digits;

    if (nationalNumber.length === 10) {
        return `(${nationalNumber.slice(0, 3)}) ${nationalNumber.slice(3, 6)}-${nationalNumber.slice(6)}`;
    }

    return phone;
}

// Format date for display
export function formatDate(date: Date | string | null): string {
    if (!date) return 'Never';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
}

// Format datetime for display
export function formatDateTime(date: Date | string | null): string {
    if (!date) return 'Never';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
    });
}

// Calculate days since last contact
export function daysSinceContact(lastContactedAt: Date | string | null): number | null {
    if (!lastContactedAt) return null;
    const lastContact = typeof lastContactedAt === 'string' ? new Date(lastContactedAt) : lastContactedAt;
    const now = new Date();
    const diffTime = now.getTime() - lastContact.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

// Check if lead is eligible for daily call list
// Per blueprint.md: not contacted in last 5 days AND not terminal status
export function isEligibleForCallList(
    lastContactedAt: Date | string | null,
    status: string
): boolean {
    const terminalStatuses = ['CLOSED_FUNDED', 'NOT_INTERESTED', 'UNQUALIFIED', 'LOST', 'DO_NOT_CONTACT'];

    if (terminalStatuses.includes(status)) {
        return false;
    }

    if (!lastContactedAt) {
        return true; // Never contacted = eligible
    }

    const days = daysSinceContact(lastContactedAt);
    return days !== null && days >= 5;
}
