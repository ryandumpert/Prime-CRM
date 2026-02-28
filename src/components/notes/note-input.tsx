'use client';

import { useState, useRef, useEffect } from 'react';
import { useVoiceDictation } from '@/hooks/useVoiceDictation';
import { Mic, MicOff, Send, Loader2 } from 'lucide-react';

interface NoteInputProps {
    leadId: string;
    onNoteSaved?: () => void;
    placeholder?: string;
    /** Compact mode for sidebars/panels */
    compact?: boolean;
}

export function NoteInput({ leadId, onNoteSaved, placeholder = 'Type a note...', compact = false }: NoteInputProps) {
    const [text, setText] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const {
        isSupported: voiceSupported,
        isListening,
        transcript,
        interimTranscript,
        toggleListening,
        clearTranscript,
        setTranscript,
        error: voiceError,
    } = useVoiceDictation();

    // Sync voice transcript to text field
    useEffect(() => {
        if (transcript) {
            setText(transcript);
        }
    }, [transcript]);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
        }
    }, [text, interimTranscript]);

    const handleTextChange = (value: string) => {
        setText(value);
        setTranscript(value);
    };

    const handleSave = async () => {
        const noteText = text.trim();
        if (!noteText || isSaving) return;

        setIsSaving(true);
        try {
            const res = await fetch(`/api/leads/${leadId}/interactions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'note',
                    direction: 'internal',
                    summary: noteText.length > 100 ? noteText.slice(0, 100) + '...' : noteText,
                    body: noteText,
                    metadata: { source: isListening ? 'voice' : 'typed' },
                }),
            });

            if (res.ok) {
                setText('');
                clearTranscript();
                onNoteSaved?.();
            }
        } catch (error) {
            console.error('Error saving note:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSave();
        }
    };

    const displayText = text + (interimTranscript ? (text ? ' ' : '') + interimTranscript : '');

    return (
        <div className={compact ? 'space-y-1' : 'space-y-2'}>
            <div className={`flex items-end gap-2 rounded-xl border transition-colors ${isListening
                ? 'border-red-500/50 bg-red-500/5'
                : 'border-[hsl(222,47%,24%)] bg-[hsl(222,47%,10%)]'
                } ${compact ? 'p-2.5' : 'p-3'}`}>
                <textarea
                    ref={textareaRef}
                    value={displayText}
                    onChange={(e) => handleTextChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={isListening ? 'Listening...' : placeholder}
                    rows={1}
                    className={`flex-1 bg-transparent border-0 outline-none resize-none text-gray-100 placeholder-gray-500 ${compact ? 'text-sm' : 'text-sm'
                        }`}
                    style={{ minHeight: compact ? '24px' : '32px', maxHeight: '120px' }}
                />

                <div className="flex items-center gap-1 shrink-0">
                    {voiceSupported && (
                        <button
                            type="button"
                            onClick={toggleListening}
                            className={`p-1.5 rounded-lg transition-all ${isListening
                                ? 'bg-red-500/20 text-red-400 animate-pulse'
                                : 'text-gray-400 hover:text-gray-200 hover:bg-[hsl(222,47%,16%)]'
                                }`}
                            title={isListening ? 'Stop dictation' : 'Start voice dictation'}
                        >
                            {isListening ? (
                                <MicOff className="w-4 h-4" />
                            ) : (
                                <Mic className="w-4 h-4" />
                            )}
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={!text.trim() || isSaving}
                        className={`p-1.5 rounded-lg transition-all ${text.trim()
                            ? 'text-blue-400 hover:bg-blue-500/20'
                            : 'text-gray-600 cursor-not-allowed'
                            }`}
                        title="Save note (Enter)"
                    >
                        {isSaving ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Send className="w-4 h-4" />
                        )}
                    </button>
                </div>
            </div>

            {isListening && (
                <p className="text-xs text-red-400/70 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                    Voice dictation active — speak clearly
                </p>
            )}

            {voiceError && (
                <p className="text-xs text-red-400">{voiceError}</p>
            )}
        </div>
    );
}
