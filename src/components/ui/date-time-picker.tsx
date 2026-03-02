'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import {
    CalendarDays,
    ChevronLeft,
    ChevronRight,
    Clock,
    X,
} from 'lucide-react';
import {
    format,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    addMonths,
    subMonths,
    isSameMonth,
    isSameDay,
    isToday,
    eachDayOfInterval,
    setHours,
    setMinutes,
} from 'date-fns';

interface DateTimePickerProps {
    /** ISO string or empty string */
    value: string;
    /** Called with ISO string when a date+time is selected, or empty string when cleared */
    onChange: (isoString: string) => void;
    /** Optional label shown above the picker */
    label?: string;
    /** Compact mode for panels */
    compact?: boolean;
    /** Additional className */
    className?: string;
}

const HOURS_12 = Array.from({ length: 12 }, (_, i) => i === 0 ? 12 : i);
const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export function DateTimePicker({
    value,
    onChange,
    label,
    compact = false,
    className,
}: DateTimePickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [viewMonth, setViewMonth] = useState(() => {
        if (value) return startOfMonth(new Date(value));
        return startOfMonth(new Date());
    });

    // Parse selected date from value
    const selectedDate = value ? new Date(value) : null;

    // Pending selection state (date + time)
    const [pendingDate, setPendingDate] = useState<Date | null>(null);
    const [hour, setHour] = useState(9);
    const [minute, setMinute] = useState(0);
    const [amPm, setAmPm] = useState<'AM' | 'PM'>('AM');

    const containerRef = useRef<HTMLDivElement>(null);
    const popoverRef = useRef<HTMLDivElement>(null);

    // Portal popover position state
    const [popoverPos, setPopoverPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

    // Sync internal state when value changes externally
    useEffect(() => {
        if (value) {
            const d = new Date(value);
            setPendingDate(d);
            const hours24 = d.getHours();
            setHour(hours24 === 0 ? 12 : hours24 > 12 ? hours24 - 12 : hours24);
            setMinute(d.getMinutes());
            setAmPm(hours24 >= 12 ? 'PM' : 'AM');
            setViewMonth(startOfMonth(d));
        } else {
            setPendingDate(null);
            setHour(9);
            setMinute(0);
            setAmPm('AM');
        }
    }, [value]);

    // Close on click outside — check both the trigger container and the portal popover
    useEffect(() => {
        if (!isOpen) return;
        const handleClick = (e: MouseEvent) => {
            const target = e.target as Node;
            if (
                containerRef.current && !containerRef.current.contains(target) &&
                popoverRef.current && !popoverRef.current.contains(target)
            ) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [isOpen]);

    // Close on Escape
    useEffect(() => {
        if (!isOpen) return;
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setIsOpen(false);
        };
        document.addEventListener('keydown', handleKey);
        return () => document.removeEventListener('keydown', handleKey);
    }, [isOpen]);

    // Position the portal popover relative to the trigger using getBoundingClientRect
    useEffect(() => {
        if (!isOpen || !containerRef.current) return;

        const updatePosition = () => {
            if (!containerRef.current || !popoverRef.current) return;
            const triggerRect = containerRef.current.getBoundingClientRect();
            const popoverEl = popoverRef.current;
            const popHeight = popoverEl.offsetHeight;
            const popWidth = popoverEl.offsetWidth;

            // Default: position below the trigger, left-aligned
            let top = triggerRect.bottom + 4 + window.scrollY;
            let left = triggerRect.left + window.scrollX;

            // If it would overflow the bottom of the viewport, show above instead
            if (triggerRect.bottom + popHeight + 16 > window.innerHeight) {
                top = triggerRect.top - popHeight - 4 + window.scrollY;
            }

            // If it would overflow the right, align to the right edge of the trigger
            if (left + popWidth > window.innerWidth - 16) {
                left = triggerRect.right - popWidth + window.scrollX;
            }

            // Safety: don't go off-screen left
            if (left < 8) left = 8;

            setPopoverPos({ top, left });
        };

        // Run once immediately, then on scroll / resize
        // Use requestAnimationFrame to ensure the popover is rendered before measuring
        const raf = requestAnimationFrame(updatePosition);

        window.addEventListener('scroll', updatePosition, true);
        window.addEventListener('resize', updatePosition);

        return () => {
            cancelAnimationFrame(raf);
            window.removeEventListener('scroll', updatePosition, true);
            window.removeEventListener('resize', updatePosition);
        };
    }, [isOpen]);

    const buildDateTime = useCallback(
        (date: Date, h: number, m: number, ap: 'AM' | 'PM'): Date => {
            let hours24 = h;
            if (ap === 'AM' && h === 12) hours24 = 0;
            else if (ap === 'PM' && h !== 12) hours24 = h + 12;
            return setMinutes(setHours(date, hours24), m);
        },
        []
    );

    const commitSelection = useCallback(
        (date: Date, h: number, m: number, ap: 'AM' | 'PM') => {
            const dt = buildDateTime(date, h, m, ap);
            onChange(dt.toISOString());
        },
        [buildDateTime, onChange]
    );

    const handleDayClick = (day: Date) => {
        setPendingDate(day);
        commitSelection(day, hour, minute, amPm);
    };

    const handleHourChange = (h: number) => {
        setHour(h);
        if (pendingDate) commitSelection(pendingDate, h, minute, amPm);
    };

    const handleMinuteChange = (m: number) => {
        setMinute(m);
        if (pendingDate) commitSelection(pendingDate, hour, m, amPm);
    };

    const handleAmPmChange = (ap: 'AM' | 'PM') => {
        setAmPm(ap);
        if (pendingDate) commitSelection(pendingDate, hour, minute, ap);
    };

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        setPendingDate(null);
        setHour(9);
        setMinute(0);
        setAmPm('AM');
        onChange('');
        setIsOpen(false);
    };

    // Calendar grid
    const monthStart = startOfMonth(viewMonth);
    const monthEnd = endOfMonth(viewMonth);
    const calendarStart = startOfWeek(monthStart);
    const calendarEnd = endOfWeek(monthEnd);
    const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

    const displayText = selectedDate
        ? format(selectedDate, 'MMM d, yyyy \'at\' h:mm a')
        : '';

    return (
        <div ref={containerRef} className={cn('relative w-full', className)}>
            {label && (
                <label className="label">{label}</label>
            )}

            {/* Trigger Button */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    'w-full flex items-center gap-2 text-left rounded-lg border transition-colors outline-none',
                    compact
                        ? 'px-3 py-2.5 text-sm min-h-[44px]'
                        : 'px-3 py-2 text-sm',
                    isOpen
                        ? 'border-blue-500/50 bg-[hsl(222,47%,14%)]'
                        : 'border-[hsl(222,47%,24%)] bg-[hsl(222,47%,14%)] hover:border-[hsl(222,47%,30%)]',
                    selectedDate ? 'text-gray-100' : 'text-gray-300'
                )}
            >
                <CalendarDays className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span className="flex-1 truncate">
                    {displayText || 'Select date & time...'}
                </span>
                {selectedDate && (
                    <span
                        role="button"
                        tabIndex={0}
                        onClick={handleClear}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClear(e as any); }}
                        className="p-0.5 rounded hover:bg-[hsl(222,47%,20%)] transition-colors cursor-pointer"
                        title="Clear date"
                    >
                        <X className="w-3.5 h-3.5 text-gray-400 hover:text-gray-200" />
                    </span>
                )}
            </button>

            {/* Popover — rendered via portal to escape overflow clipping */}
            {isOpen && createPortal(
                <div
                    ref={popoverRef}
                    className="fixed z-[9999] bg-[hsl(222,47%,11%)] border border-[hsl(222,47%,24%)] rounded-xl shadow-2xl shadow-black/50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
                    style={{ minWidth: '300px', top: `${popoverPos.top}px`, left: `${popoverPos.left}px` }}
                >
                    {/* Calendar Header */}
                    <div className="flex items-center justify-between px-4 pt-4 pb-2">
                        <button
                            type="button"
                            onClick={() => setViewMonth(subMonths(viewMonth, 1))}
                            className="p-1.5 rounded-lg hover:bg-[hsl(222,47%,16%)] transition-colors text-gray-300 hover:text-white"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="text-sm font-semibold text-gray-200">
                            {format(viewMonth, 'MMMM yyyy')}
                        </span>
                        <button
                            type="button"
                            onClick={() => setViewMonth(addMonths(viewMonth, 1))}
                            className="p-1.5 rounded-lg hover:bg-[hsl(222,47%,16%)] transition-colors text-gray-300 hover:text-white"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Day-of-week headers */}
                    <div className="grid grid-cols-7 px-3 pb-1">
                        {WEEKDAYS.map((d) => (
                            <div
                                key={d}
                                className="text-center text-[11px] font-medium text-gray-600 py-1"
                            >
                                {d}
                            </div>
                        ))}
                    </div>

                    {/* Calendar Grid */}
                    <div className="grid grid-cols-7 px-3 pb-3 gap-0.5">
                        {calendarDays.map((day) => {
                            const inMonth = isSameMonth(day, viewMonth);
                            const isSelected = selectedDate && isSameDay(day, selectedDate);
                            const isPending = pendingDate && isSameDay(day, pendingDate);
                            const today = isToday(day);

                            return (
                                <button
                                    type="button"
                                    key={day.toISOString()}
                                    onClick={() => handleDayClick(day)}
                                    className={cn(
                                        'relative w-full aspect-square flex items-center justify-center rounded-lg text-xs font-medium transition-all',
                                        !inMonth && 'text-gray-700',
                                        inMonth && !isSelected && !isPending && 'text-gray-200 hover:bg-[hsl(222,47%,18%)] hover:text-white',
                                        (isSelected || isPending) && 'bg-blue-500 text-white shadow-lg shadow-blue-500/25',
                                        today && !isSelected && !isPending && 'ring-1 ring-blue-500/40 text-blue-400'
                                    )}
                                >
                                    {format(day, 'd')}
                                </button>
                            );
                        })}
                    </div>

                    {/* Divider */}
                    <div className="border-t border-[hsl(222,47%,22%)]" />

                    {/* Time Picker */}
                    <div className="px-4 py-3">
                        <div className="flex items-center gap-2 mb-2.5">
                            <Clock className="w-3.5 h-3.5 text-gray-400" />
                            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                Time
                            </span>
                        </div>

                        <div className="flex items-center gap-2">
                            {/* Hour */}
                            <select
                                value={hour}
                                onChange={(e) => handleHourChange(Number(e.target.value))}
                                className="flex-1 px-2 py-2 rounded-lg bg-[hsl(222,47%,14%)] border border-[hsl(222,47%,24%)] text-sm text-gray-100 outline-none focus:border-blue-500/50 transition-colors appearance-none text-center cursor-pointer"
                            >
                                {HOURS_12.map((h) => (
                                    <option key={h} value={h}>
                                        {h}
                                    </option>
                                ))}
                            </select>

                            <span className="text-gray-400 font-bold text-lg">:</span>

                            {/* Minute */}
                            <select
                                value={minute}
                                onChange={(e) => handleMinuteChange(Number(e.target.value))}
                                className="flex-1 px-2 py-2 rounded-lg bg-[hsl(222,47%,14%)] border border-[hsl(222,47%,24%)] text-sm text-gray-100 outline-none focus:border-blue-500/50 transition-colors appearance-none text-center cursor-pointer"
                            >
                                {MINUTES.map((m) => (
                                    <option key={m} value={m}>
                                        {String(m).padStart(2, '0')}
                                    </option>
                                ))}
                            </select>

                            {/* AM/PM Toggle */}
                            <div className="flex rounded-lg border border-[hsl(222,47%,24%)] overflow-hidden">
                                <button
                                    type="button"
                                    onClick={() => handleAmPmChange('AM')}
                                    className={cn(
                                        'px-3 py-2 text-xs font-semibold transition-colors',
                                        amPm === 'AM'
                                            ? 'bg-blue-500/20 text-blue-400 border-r border-blue-500/30'
                                            : 'bg-[hsl(222,47%,14%)] text-gray-300 border-r border-[hsl(222,47%,24%)] hover:text-gray-200'
                                    )}
                                >
                                    AM
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleAmPmChange('PM')}
                                    className={cn(
                                        'px-3 py-2 text-xs font-semibold transition-colors',
                                        amPm === 'PM'
                                            ? 'bg-blue-500/20 text-blue-400'
                                            : 'bg-[hsl(222,47%,14%)] text-gray-300 hover:text-gray-200'
                                    )}
                                >
                                    PM
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Quick actions footer */}
                    <div className="border-t border-[hsl(222,47%,22%)] px-4 py-2.5 flex items-center justify-between">
                        <button
                            type="button"
                            onClick={() => {
                                const now = new Date();
                                setViewMonth(startOfMonth(now));
                                handleDayClick(now);
                            }}
                            className="text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors"
                        >
                            Today
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsOpen(false)}
                            className="text-xs px-3 py-1.5 rounded-lg bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 font-medium transition-colors"
                        >
                            Done
                        </button>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
