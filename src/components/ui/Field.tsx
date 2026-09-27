// =============================================================================
// FLILINK — Text field with label, prefix and inline error
// =============================================================================

'use client';

import { forwardRef, useId } from 'react';
import { cn } from '@/lib/utils';

interface FieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  error?: string;
  hint?: string;
}

export const Field = forwardRef<HTMLInputElement, FieldProps>(function Field(
  { label, leading, trailing, error, hint, className, id, ...rest },
  ref
) {
  const autoId = useId();
  const inputId = id || autoId;
  return (
    <div className={className}>
      {label && (
        <label htmlFor={inputId} className="mb-1.5 block text-[13px] font-semibold text-ink-2">
          {label}
        </label>
      )}
      <div
        className={cn(
          'flex h-13 items-center gap-2 rounded-2xl border bg-white px-4 transition-colors',
          'focus-within:border-ink focus-within:ring-4 focus-within:ring-ink/5',
          error ? 'border-red-400' : 'border-line',
          rest.disabled && 'bg-canvas'
        )}
      >
        {leading && <span className="shrink-0 text-muted">{leading}</span>}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          className="h-full w-full min-w-0 bg-transparent text-[16px] text-ink outline-none placeholder:text-subtle disabled:text-muted"
          {...rest}
        />
        {trailing && <span className="shrink-0">{trailing}</span>}
      </div>
      {error ? (
        <p className="mt-1.5 text-xs font-medium text-red-600">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-muted">{hint}</p>
      ) : null}
    </div>
  );
});
