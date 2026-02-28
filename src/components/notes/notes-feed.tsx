'use client';

import { useState, useEffect, useCallback } from 'react';
import { formatDateTime } from '@/lib/utils';
import { Pin, PinOff, FileText, Mic, ChevronDown, ChevronUp } from 'lucide-react';

interface Note {
    id: string;
    summary: string | null;
    body: string | null;
    occurredAt: string;
    metadata: { pinned?: boolean; source?: 'typed' | 'voice' } | null;
    user: { id: string; displayName: string };
}

interface NotesFeedProps {
    leadId: string;
    /** Max notes to show initially (set to 0 for unlimited) */
    limit?: number;
    /** Whether to show the "See all" toggle */
    showSeeAll?: boolean;
    /** Compact mode for sidebars */
    compact?: boolean;
    /** External refresh trigger - increment to refresh */
    refreshKey?: number;
    /** Callback when notes are loaded */
    onLoad?: (count: number) => void;
}

export function NotesFeed({
    leadId,
    limit = 5,
    showSeeAll = true,
    compact = false,
    refreshKey = 0,
    onLoad,
}: NotesFeedProps) {
    const [notes, setNotes] = useState<Note[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [expanded, setExpanded] = useState(false);

    const fetchNotes = useCallback(async () => {
        try {
            const res = await fetch(`/api/leads/${leadId}/notes?limit=50`);
            const data = await res.json();
            if (data.data) {
                setNotes(data.data);
                onLoad?.(data.data.length);
            }
        } catch (error) {
            console.error('Error fetching notes:', error);
        } finally {
            setIsLoading(false);
        }
    }, [leadId, onLoad]);

    useEffect(() => {
        fetchNotes();
    }, [fetchNotes, refreshKey]);

    const togglePin = async (noteId: string, currentlyPinned: boolean) => {
        try {
            await fetch(`/api/leads/${leadId}/notes`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ noteId, pinned: !currentlyPinned }),
            });
            fetchNotes();
        } catch (error) {
            console.error('Error toggling pin:', error);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-4">
                <div className="w-4 h-4 border-2 border-gray-600 border-t-gray-300 rounded-full animate-spin" />
            </div>
        );
    }

    if (notes.length === 0) {
        return (
            <div className={`text-center text-gray-400 ${compact ? 'py-3' : 'py-6'}`}>
                <FileText className={`mx-auto mb-2 opacity-50 ${compact ? 'w-6 h-6' : 'w-8 h-8'}`} />
                <p className={compact ? 'text-xs' : 'text-sm'}>No notes yet</p>
            </div>
        );
    }

    const displayNotes = limit > 0 && !expanded ? notes.slice(0, limit) : notes;
    const hasMore = limit > 0 && notes.length > limit;

    return (
        <div className="space-y-2">
            {displayNotes.map((note) => {
                const isPinned = note.metadata?.pinned === true;
                const isVoice = note.metadata?.source === 'voice';

                return (
                    <div
                        key={note.id}
                        className={`group rounded-lg border transition-colors ${isPinned
                            ? 'border-amber-500/35 bg-amber-500/5'
                            : 'border-[hsl(222,47%,22%)] bg-[hsl(222,47%,10%)]'
                            } ${compact ? 'p-3.5' : 'p-4'}`}
                    >
                        {/* Header */}
                        <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2 text-xs text-gray-300 min-w-0">
                                {isPinned && <Pin className="w-3 h-3 text-amber-400 shrink-0" />}
                                {isVoice && <Mic className="w-3 h-3 text-blue-400 shrink-0" />}
                                <span className="truncate">{note.user.displayName}</span>
                                <span className="text-gray-400">·</span>
                                <span className="whitespace-nowrap">{formatDateTime(note.occurredAt)}</span>
                            </div>
                            <button
                                onClick={() => togglePin(note.id, isPinned)}
                                className={`opacity-0 group-hover:opacity-100 p-1 rounded transition-all ${isPinned
                                    ? 'text-amber-400 hover:bg-amber-500/20'
                                    : 'text-gray-400 hover:text-gray-200 hover:bg-[hsl(222,47%,16%)]'
                                    }`}
                                title={isPinned ? 'Unpin note' : 'Pin note'}
                            >
                                {isPinned ? (
                                    <PinOff className="w-3.5 h-3.5" />
                                ) : (
                                    <Pin className="w-3.5 h-3.5" />
                                )}
                            </button>
                        </div>

                        {/* Body */}
                        <p className={`text-gray-200 whitespace-pre-wrap break-words ${compact ? 'text-sm leading-relaxed' : 'text-sm leading-relaxed'
                            }`}>
                            {note.body || note.summary || ''}
                        </p>
                    </div>
                );
            })}

            {/* See all toggle */}
            {showSeeAll && hasMore && (
                <button
                    onClick={() => setExpanded(!expanded)}
                    className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors w-full justify-center py-1"
                >
                    {expanded ? (
                        <>
                            <ChevronUp className="w-3 h-3" />
                            Show less
                        </>
                    ) : (
                        <>
                            <ChevronDown className="w-3 h-3" />
                            See all {notes.length} notes
                        </>
                    )}
                </button>
            )}
        </div>
    );
}
