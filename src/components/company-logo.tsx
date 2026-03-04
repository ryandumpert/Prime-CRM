'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';

interface CompanyLogoContextValue {
    logoUrl: string | null;
    isLoading: boolean;
    refresh: () => void;
}

const CompanyLogoContext = createContext<CompanyLogoContextValue>({
    logoUrl: null,
    isLoading: true,
    refresh: () => { },
});

export function CompanyLogoProvider({ children }: { children: ReactNode }) {
    const [logoUrl, setLogoUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchLogo = useCallback(async () => {
        try {
            const res = await fetch('/api/settings/logo');
            const data = await res.json();
            setLogoUrl(data.logoUrl || null);
        } catch {
            setLogoUrl(null);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchLogo();
    }, [fetchLogo]);

    return (
        <CompanyLogoContext.Provider value={{ logoUrl, isLoading, refresh: fetchLogo }}>
            {children}
        </CompanyLogoContext.Provider>
    );
}

export function useCompanyLogo() {
    return useContext(CompanyLogoContext);
}

// Reusable logo component with fallback
export function CompanyLogo({
    size = 40,
    className = '',
    fallbackLetter = 'P',
}: {
    size?: number;
    className?: string;
    fallbackLetter?: string;
}) {
    const { logoUrl, isLoading } = useCompanyLogo();

    if (isLoading) {
        return (
            <div
                className={`rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30 shrink-0 ${className}`}
                style={{ width: size, height: size }}
            >
                <span
                    className="text-white font-bold"
                    style={{ fontSize: size * 0.45 }}
                >
                    {fallbackLetter}
                </span>
            </div>
        );
    }

    if (logoUrl) {
        return (
            <img
                src={logoUrl}
                alt="Company Logo"
                className={`object-contain shrink-0 ${className}`}
                style={{ width: size, height: size }}
            />
        );
    }

    // Default fallback (no logo uploaded)
    return (
        <div
            className={`rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30 shrink-0 ${className}`}
            style={{ width: size, height: size }}
        >
            <span
                className="text-white font-bold"
                style={{ fontSize: size * 0.45 }}
            >
                {fallbackLetter}
            </span>
        </div>
    );
}
