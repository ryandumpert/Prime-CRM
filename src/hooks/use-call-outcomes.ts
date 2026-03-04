'use client';

import { useEffect, useState, useCallback } from 'react';

export interface CallOutcomeOption {
    id: string;
    label: string;
    category: 'positive' | 'neutral' | 'negative';
    countsAsContact: boolean;
    active: boolean;
    sortOrder: number;
}

// Module-level cache so we don't re-fetch on every component mount
let cachedOutcomes: CallOutcomeOption[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export function useCallOutcomes() {
    const [outcomes, setOutcomes] = useState<CallOutcomeOption[]>(cachedOutcomes || []);
    const [isLoading, setIsLoading] = useState(!cachedOutcomes);

    const fetchOutcomes = useCallback(async (force = false) => {
        const now = Date.now();
        if (!force && cachedOutcomes && (now - cacheTimestamp) < CACHE_TTL) {
            setOutcomes(cachedOutcomes);
            setIsLoading(false);
            return;
        }

        try {
            const res = await fetch('/api/settings/call-outcomes');
            const data = await res.json();
            const active = (data.data || [])
                .filter((o: CallOutcomeOption) => o.active)
                .sort((a: CallOutcomeOption, b: CallOutcomeOption) => a.sortOrder - b.sortOrder);
            cachedOutcomes = active;
            cacheTimestamp = now;
            setOutcomes(active);
        } catch {
            setOutcomes([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchOutcomes();
    }, [fetchOutcomes]);

    const refresh = useCallback(() => {
        cachedOutcomes = null;
        cacheTimestamp = 0;
        fetchOutcomes(true);
    }, [fetchOutcomes]);

    // Helper: get label for an outcome ID
    const getLabel = useCallback((outcomeId: string): string => {
        const found = outcomes.find(o => o.id === outcomeId);
        return found?.label || outcomeId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }, [outcomes]);

    // Helper: get category color class for an outcome ID
    const getCategoryColor = useCallback((outcomeId: string): string => {
        const found = outcomes.find(o => o.id === outcomeId);
        if (!found) return 'text-blue-400';
        switch (found.category) {
            case 'positive': return 'text-green-400';
            case 'negative': return 'text-red-400';
            default: return 'text-blue-400';
        }
    }, [outcomes]);

    // Helper: check if an outcome counts as contact
    const doesCountAsContact = useCallback((outcomeId: string): boolean => {
        const found = outcomes.find(o => o.id === outcomeId);
        return found?.countsAsContact ?? false;
    }, [outcomes]);

    // Grouped outcomes for display in dropdowns
    const groupedOutcomes = {
        positive: outcomes.filter(o => o.category === 'positive'),
        neutral: outcomes.filter(o => o.category === 'neutral'),
        negative: outcomes.filter(o => o.category === 'negative'),
    };

    return {
        outcomes,
        groupedOutcomes,
        isLoading,
        refresh,
        getLabel,
        getCategoryColor,
        doesCountAsContact,
    };
}

// Invalidate cache (call after admin saves new outcomes)
export function invalidateCallOutcomesCache() {
    cachedOutcomes = null;
    cacheTimestamp = 0;
}
