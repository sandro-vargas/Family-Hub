'use client';

import React, { useState, useRef } from 'react';
import { Mic, MicOff } from 'lucide-react';

interface VoiceInputButtonProps {
  onTranscript: (text: string) => void;
  placeholderHint?: string;
}

export function VoiceInputButton({ onTranscript }: VoiceInputButtonProps) {
  const [isListening, setIsListening] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  const toggleListening = () => {
    setErrorMsg(null);

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setErrorMsg('Spracheingabe wird von diesem Browser nicht unterstützt.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'de-CH';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results?.[0]?.[0]?.transcript;
      if (transcript) {
        onTranscript(transcript);
      }
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  return (
    <div className="inline-flex items-center gap-1.5">
      <button
        type="button"
        onClick={toggleListening}
        title={isListening ? 'Aufnahme stoppen' : 'Spracheingabe starten (de-CH)'}
        className={`inline-flex items-center justify-center rounded-xl p-2.5 font-medium transition-all shadow-xs ${
          isListening
            ? 'bg-[#5CA6CE] text-white animate-pulse ring-4 ring-[#5CA6CE]/30'
            : 'bg-[#5CA6CE]/15 text-[#2d7ba4] hover:bg-[#5CA6CE] hover:text-white'
        }`}
      >
        {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
      </button>
      {errorMsg && <span className="text-xs text-red-600">{errorMsg}</span>}
    </div>
  );
}
