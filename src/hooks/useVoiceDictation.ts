'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

interface UseVoiceDictationOptions {
    /** Language for speech recognition (default: 'en-US') */
    lang?: string;
    /** Whether to use continuous recognition (default: true) */
    continuous?: boolean;
    /** Whether to return interim results (default: true) */
    interimResults?: boolean;
}

interface UseVoiceDictationReturn {
    /** Whether the browser supports speech recognition */
    isSupported: boolean;
    /** Whether recognition is currently active */
    isListening: boolean;
    /** The final transcribed text */
    transcript: string;
    /** Interim (in-progress) transcript text */
    interimTranscript: string;
    /** Start listening */
    startListening: () => void;
    /** Stop listening */
    stopListening: () => void;
    /** Toggle listening on/off */
    toggleListening: () => void;
    /** Clear the transcript */
    clearTranscript: () => void;
    /** Set the transcript manually (e.g., to prepend existing text) */
    setTranscript: (text: string) => void;
    /** Error message if any */
    error: string | null;
}

export function useVoiceDictation(options: UseVoiceDictationOptions = {}): UseVoiceDictationReturn {
    const {
        lang = 'en-US',
        continuous = true,
        interimResults = true,
    } = options;

    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [interimTranscript, setInterimTranscript] = useState('');
    const [error, setError] = useState<string | null>(null);
    const recognitionRef = useRef<any>(null);
    const transcriptRef = useRef('');

    // Check browser support
    const isSupported = typeof window !== 'undefined' && (
        'SpeechRecognition' in window ||
        'webkitSpeechRecognition' in window
    );

    // Keep ref in sync with state
    useEffect(() => {
        transcriptRef.current = transcript;
    }, [transcript]);

    const startListening = useCallback(() => {
        if (!isSupported) {
            setError('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
            return;
        }

        setError(null);

        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        const recognition = new SpeechRecognition();

        recognition.lang = lang;
        recognition.continuous = continuous;
        recognition.interimResults = interimResults;

        recognition.onstart = () => {
            setIsListening(true);
        };

        recognition.onresult = (event: any) => {
            let finalText = '';
            let interimText = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const result = event.results[i];
                if (result.isFinal) {
                    finalText += result[0].transcript;
                } else {
                    interimText += result[0].transcript;
                }
            }

            if (finalText) {
                const currentText = transcriptRef.current;
                const separator = currentText && !currentText.endsWith(' ') ? ' ' : '';
                const newText = currentText + separator + finalText;
                setTranscript(newText);
                transcriptRef.current = newText;
            }

            setInterimTranscript(interimText);
        };

        recognition.onerror = (event: any) => {
            if (event.error === 'no-speech') {
                // Silently ignore no-speech
                return;
            }
            if (event.error === 'aborted') {
                return;
            }
            setError(`Speech recognition error: ${event.error}`);
            setIsListening(false);
        };

        recognition.onend = () => {
            setIsListening(false);
            setInterimTranscript('');
        };

        recognitionRef.current = recognition;

        try {
            recognition.start();
        } catch (e) {
            setError('Failed to start speech recognition. Please check microphone permissions.');
        }
    }, [isSupported, lang, continuous, interimResults]);

    const stopListening = useCallback(() => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
            recognitionRef.current = null;
        }
        setIsListening(false);
        setInterimTranscript('');
    }, []);

    const toggleListening = useCallback(() => {
        if (isListening) {
            stopListening();
        } else {
            startListening();
        }
    }, [isListening, startListening, stopListening]);

    const clearTranscript = useCallback(() => {
        setTranscript('');
        setInterimTranscript('');
        transcriptRef.current = '';
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
        };
    }, []);

    return {
        isSupported,
        isListening,
        transcript,
        interimTranscript,
        startListening,
        stopListening,
        toggleListening,
        clearTranscript,
        setTranscript,
        error,
    };
}
