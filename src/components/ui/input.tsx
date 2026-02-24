'use client';

import { cn } from '@/lib/utils';
import { forwardRef, InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    error?: boolean;
    label?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ className, error, label, id, ...props }, ref) => {
        return (
            <div className="w-full">
                {label && (
                    <label htmlFor={id} className="label">
                        {label}
                    </label>
                )}
                <input
                    ref={ref}
                    id={id}
                    className={cn('input', error && 'input-error', className)}
                    {...props}
                />
            </div>
        );
    }
);

Input.displayName = 'Input';

export { Input };
