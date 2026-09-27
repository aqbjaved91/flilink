// =============================================================================
// FLILINK — OTP input
// One real <input> (so paste, SMS/email autofill and backspace all behave
// natively) drawn as individual digit boxes.
// =============================================================================

'use client';

import { useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface OtpInputProps {
  length: number;
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  error?: boolean;
  disabled?: boolean;
}

export function OtpInput({ length, value, onChange, onComplete, error, disabled }: OtpInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(true);

  const handleChange = (raw: string) => {
    const next = raw.replace(/\D/g, '').slice(0, length);
    onChange(next);
    if (next.length === length) onComplete?.(next);
  };

  return (
    <div className="relative" onClick={() => inputRef.current?.focus()}>
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        inputMode="numeric"
        autoComplete="one-time-code"
        autoFocus
        disabled={disabled}
        maxLength={length}
        aria-label={`${length}-digit verification code`}
        className="absolute inset-0 z-10 h-full w-full cursor-text opacity-0"
      />
      <div className="flex justify-between gap-1.5">
        {Array.from({ length }).map((_, i) => {
          const char = value[i] ?? '';
          const isActive = focused && i === Math.min(value.length, length - 1);
          return (
            <div
              key={i}
              className={cn(
                'flex h-13 flex-1 items-center justify-center rounded-xl border-[1.5px] text-xl font-bold text-ink transition-all',
                error
                  ? 'border-red-400 bg-red-50'
                  : isActive
                    ? 'border-ink bg-white ring-4 ring-ink/5'
                    : char
                      ? 'border-ink/20 bg-white'
                      : 'border-line bg-canvas'
              )}
            >
              {char ? (
                <span className="animate-pop">{char}</span>
              ) : isActive ? (
                <span className="h-6 w-[2px] animate-pulse rounded bg-ink" />
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
