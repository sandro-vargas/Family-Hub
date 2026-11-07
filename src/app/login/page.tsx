'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, ShieldCheck, ArrowRight, Delete, RotateCcw, Home, KeyRound } from 'lucide-react';
import { useFamily } from '@/context/family-context';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || '/';

  const { members, setActiveMemberId, activeMember } = useFamily();

  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string>(activeMember?.id || '');

  useEffect(() => {
    if (!selectedMemberId && activeMember?.id) {
      setSelectedMemberId(activeMember.id);
    }
  }, [activeMember, selectedMemberId]);

  const handleKeyPress = (digit: string) => {
    if (pin.length < 8) {
      const nextPin = pin + digit;
      setPin(nextPin);
      setError(null);

      // Auto-submit on 4-digit code (e.g. 8624)
      if (nextPin.length === 4) {
        attemptLogin(nextPin);
      }
    }
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
    setError(null);
  };

  const handleClear = () => {
    setPin('');
    setError(null);
  };

  const attemptLogin = async (passcodeToTry: string) => {
    if (!passcodeToTry || isLoading) return;
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode: passcodeToTry }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        if (selectedMemberId) {
          setActiveMemberId(selectedMemberId);
        }
        router.push(redirectUrl);
        router.refresh();
      } else {
        setError(data.error || 'Ungültiger Familien-Code');
        setPin('');
      }
    } catch {
      setError('Verbindungsfehler beim Anmelden');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    attemptLogin(pin);
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-4 bg-gradient-to-br from-[#DCE8DF] via-[#EBF2EE] to-[#D6E7F2] text-[#1E293B] relative overflow-hidden select-none">
      {/* Soft Ambient Blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div className="absolute -top-28 -left-28 w-96 h-96 rounded-full bg-[#74956C]/20 blur-3xl" />
        <div className="absolute top-1/3 -right-28 w-96 h-96 rounded-full bg-[#5CA6CE]/20 blur-3xl" />
        <div className="absolute -bottom-24 left-1/4 w-80 h-80 rounded-full bg-amber-200/25 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-sm sm:max-w-md bg-white/80 backdrop-blur-2xl rounded-[36px] p-6 sm:p-8 shadow-2xl border border-white/80 flex flex-col items-center text-center">
        {/* Brand Icon */}
        <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-[26px] bg-gradient-to-br from-[#74956C] to-[#5CA6CE] flex items-center justify-center shadow-md text-white mb-4">
          <Home className="h-8 w-8 sm:h-10 sm:w-10" />
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#74956C]/10 text-[#54774c] text-xs font-bold mb-2">
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>Geschützter Familienbereich</span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#1E293B]">
          Family Hub
        </h1>
        <p className="text-xs sm:text-sm font-semibold text-slate-500 mt-1">
          8624 Grüt (ZH) • Bitte Familien-Code eingeben
        </p>

        {/* Member Selector (Optional quick profile pick) */}
        {members.length > 0 && (
          <div className="mt-5 w-full">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
              Wer bist du?
            </span>
            <div className="flex items-center justify-center gap-2">
              {members
                .filter((m) => m.is_selectable_actor)
                .map((m) => {
                  const isSelected = selectedMemberId === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setSelectedMemberId(m.id)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-2xl text-xs font-bold transition-all ${
                        isSelected
                          ? 'bg-[#1E293B] text-white shadow-xs scale-105'
                          : 'bg-white/70 text-slate-600 hover:bg-white border border-slate-200/60'
                      }`}
                    >
                      <span
                        className="h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-extrabold text-white"
                        style={{ backgroundColor: m.color_hex }}
                      >
                        {m.short_code}
                      </span>
                      <span>{m.display_name}</span>
                    </button>
                  );
                })}
            </div>
          </div>
        )}

        {/* PIN Indicators Display */}
        <div className="mt-6 flex items-center justify-center gap-3">
          {[0, 1, 2, 3].map((idx) => {
            const hasDigit = pin.length > idx;
            return (
              <div
                key={idx}
                className={`h-4 w-4 rounded-full transition-all duration-200 ${
                  hasDigit
                    ? 'bg-[#74956C] scale-125 shadow-xs'
                    : 'bg-slate-200 border border-slate-300'
                }`}
              />
            );
          })}
        </div>

        {/* Error message */}
        {error && (
          <div className="mt-3 text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-xl animate-shake">
            {error}
          </div>
        )}

        {/* Keyboard input option (for Desktop) */}
        <form onSubmit={handleSubmit} className="mt-3 w-full">
          <input
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            value={pin}
            onChange={(e) => {
              setPin(e.target.value.slice(0, 8));
              setError(null);
            }}
            placeholder="PIN oder Code"
            className="w-full text-center tracking-widest text-lg font-bold py-2 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#74956C]/40 text-[#1E293B]"
          />
        </form>

        {/* Tactile Android Keypad (for Phone & iPad) */}
        <div className="mt-5 grid grid-cols-3 gap-2.5 sm:gap-3 w-full max-w-[280px]">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleKeyPress(digit)}
              className="h-14 sm:h-16 rounded-[22px] bg-white/90 hover:bg-white text-xl sm:text-2xl font-extrabold text-[#1E293B] shadow-xs active:scale-95 transition-all flex items-center justify-center border border-slate-200/60"
            >
              {digit}
            </button>
          ))}

          <button
            type="button"
            onClick={handleClear}
            className="h-14 sm:h-16 rounded-[22px] bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-500 shadow-2xs active:scale-95 transition-all flex items-center justify-center border border-slate-200/60"
            title="Löschen"
          >
            <RotateCcw className="h-5 w-5" />
          </button>

          <button
            type="button"
            onClick={() => handleKeyPress('0')}
            className="h-14 sm:h-16 rounded-[22px] bg-white/90 hover:bg-white text-xl sm:text-2xl font-extrabold text-[#1E293B] shadow-xs active:scale-95 transition-all flex items-center justify-center border border-slate-200/60"
          >
            0
          </button>

          <button
            type="button"
            onClick={handleBackspace}
            className="h-14 sm:h-16 rounded-[22px] bg-slate-100 hover:bg-slate-200 text-slate-600 shadow-2xs active:scale-95 transition-all flex items-center justify-center border border-slate-200/60"
            title="Rücktaste"
          >
            <Delete className="h-5 w-5" />
          </button>
        </div>

        {/* Submit button (if PIN not 4 digits or manual click) */}
        <button
          type="button"
          onClick={() => attemptLogin(pin)}
          disabled={isLoading || pin.length === 0}
          className="mt-5 w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-[#74956C] to-[#5CA6CE] text-white font-extrabold text-sm shadow-md hover:opacity-95 active:scale-98 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isLoading ? (
            <span>Wird überprüft...</span>
          ) : (
            <>
              <KeyRound className="h-4 w-4" />
              <span>Entsperren</span>
            </>
          )}
        </button>

        <p className="mt-4 text-[11px] text-slate-400 font-medium">
          Standard-Code: <span className="font-bold text-slate-500">8624</span> (oder eigener Code in Vercel)
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#DCE8DF] via-[#EBF2EE] to-[#D6E7F2]">
          <div className="h-10 w-10 border-4 border-[#74956C] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}

