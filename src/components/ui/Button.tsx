// =============================================================================
// FLILINK — Button
// =============================================================================

'use client';

import { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { Spinner } from './Spinner';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'dark';
type Size = 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
}

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-brand text-white shadow-[0_6px_16px_rgba(242,85,61,0.28)] hover:bg-brand-600 disabled:bg-[#c7cad1] disabled:shadow-none',
  dark: 'bg-ink text-white hover:bg-black disabled:bg-[#c7cad1]',
  secondary:
    'bg-white text-ink border border-line hover:bg-canvas disabled:text-subtle',
  ghost: 'bg-transparent text-ink-2 hover:bg-canvas disabled:text-subtle',
  danger: 'bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300',
};

const SIZES: Record<Size, string> = {
  md: 'h-11 px-4 text-sm rounded-xl',
  lg: 'h-13 px-5 text-[15px] rounded-2xl',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'lg', loading, fullWidth, className, children, disabled, ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'tap inline-flex items-center justify-center gap-2 font-semibold disabled:cursor-not-allowed',
        VARIANTS[variant],
        SIZES[size],
        fullWidth && 'w-full',
        className
      )}
      {...rest}
    >
      {loading ? <Spinner className="h-5 w-5" /> : children}
    </button>
  );
});
