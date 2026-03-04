'use client';

import { SessionProvider } from 'next-auth/react';
import { CompanyLogoProvider } from '@/components/company-logo';
import { ReactNode } from 'react';

export function Providers({ children }: { children: ReactNode }) {
    return (
        <SessionProvider>
            <CompanyLogoProvider>
                {children}
            </CompanyLogoProvider>
        </SessionProvider>
    );
}
