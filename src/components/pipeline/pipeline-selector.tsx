'use client';

import { cn } from '@/lib/utils';
import {
    PIPELINES,
    PIPELINE_LABELS,
    PIPELINE_COLORS,
    PipelineType,
} from '@/lib/constants';
import { ChevronDown } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

interface PipelineSelectorProps {
    value: PipelineType;
    onChange: (pipeline: PipelineType) => void;
    className?: string;
}

export function PipelineSelector({ value, onChange, className }: PipelineSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const colors = PIPELINE_COLORS[value];

    return (
        <div ref={dropdownRef} className={cn('relative', className)}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-200',
                    'bg-[hsl(222,47%,11%)] hover:bg-[hsl(222,47%,14%)]',
                    'w-full md:w-auto min-w-[200px]',
                    colors.border
                )}
            >
                <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: colors.accent }}
                />
                <span className={cn('font-semibold text-base', colors.text)}>
                    {PIPELINE_LABELS[value]}
                </span>
                <ChevronDown
                    className={cn(
                        'w-4 h-4 ml-auto transition-transform duration-200',
                        colors.text,
                        isOpen && 'rotate-180'
                    )}
                />
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 right-0 md:right-auto mt-2 w-full md:w-[240px] z-50 rounded-xl border border-[hsl(222,47%,18%)] bg-[hsl(222,47%,11%)] shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    {PIPELINES.map((pipeline) => {
                        const pColors = PIPELINE_COLORS[pipeline];
                        const isActive = pipeline === value;
                        return (
                            <button
                                key={pipeline}
                                onClick={() => {
                                    onChange(pipeline);
                                    setIsOpen(false);
                                }}
                                className={cn(
                                    'flex items-center gap-3 w-full px-4 py-3.5 text-left transition-colors',
                                    'hover:bg-[hsl(222,47%,14%)] active:bg-[hsl(222,47%,16%)]',
                                    isActive && 'bg-[hsl(222,47%,14%)]'
                                )}
                            >
                                <span
                                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: pColors.accent }}
                                />
                                <div className="flex flex-col">
                                    <span className={cn('font-medium text-sm', isActive ? pColors.text : 'text-gray-200')}>
                                        {PIPELINE_LABELS[pipeline]}
                                    </span>
                                </div>
                                {isActive && (
                                    <span className={cn('ml-auto text-xs', pColors.text)}>●</span>
                                )}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
