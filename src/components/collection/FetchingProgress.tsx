// =============================================================================
// FLILINK — "Fetching product details…" progress screen
// Real progress: `done` advances as each product's details are fetched.
// =============================================================================

'use client';

import { Check, Package, Shirt, ShoppingBag, Sparkles, Tag } from 'lucide-react';
import { Spinner } from '@/components/ui/Spinner';
import { cn } from '@/lib/utils';

const STEPS = [
  { label: 'Fetching product images', at: 0.25 },
  { label: 'Extracting titles and prices', at: 0.6 },
  { label: 'Getting the best data for you', at: 0.9 },
  { label: 'Almost there…', at: 1 },
];

export function FetchingProgress({ done, total }: { done: number; total: number }) {
  const progress = total > 0 ? done / total : 0;
  const activeIndex = STEPS.findIndex((s) => progress < s.at);

  return (
    <div className="animate-fade-up flex flex-1 flex-col items-center px-6 pt-10">
      {/* Illustration: open box with products floating out */}
      <div className="relative flex h-48 w-56 items-end justify-center">
        <div className="absolute bottom-6 h-24 w-40 rounded-full bg-brand/10 blur-2xl" />
        <FloatIcon icon={Shirt} className="left-6 top-6 bg-[#e0e7ff] text-[#4f5bd5]" delay="0s" />
        <FloatIcon icon={ShoppingBag} className="right-5 top-10 bg-[#dbeafe] text-[#2563eb]" delay="0.5s" />
        <FloatIcon icon={Tag} className="left-1/2 top-0 -translate-x-1/2 bg-brand-50 text-brand" delay="1s" />
        <Sparkles className="absolute right-12 top-1 h-4 w-4 text-brand" />
        <div className="relative flex h-24 w-28 items-center justify-center rounded-3xl bg-gradient-to-b from-[#ffb561] to-[#f28c28] text-white shadow-[0_14px_30px_rgba(242,140,40,0.35)]">
          <Package className="h-12 w-12" strokeWidth={1.6} />
        </div>
      </div>

      <h2 className="mt-8 text-xl font-bold text-ink">Fetching product details…</h2>
      <p className="mt-1.5 text-sm text-muted">This may take a few seconds</p>

      <div className="mt-7 flex w-full items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-line">
          <div
            className="h-full rounded-full bg-brand transition-[width] duration-500 ease-out"
            style={{
              width: `${Math.max(4, progress * 100)}%`,
              backgroundImage:
                'linear-gradient(45deg,rgba(255,255,255,.18) 25%,transparent 25%,transparent 50%,rgba(255,255,255,.18) 50%,rgba(255,255,255,.18) 75%,transparent 75%)',
              backgroundSize: '24px 24px',
              animation: 'progress-stripes 0.8s linear infinite',
            }}
          />
        </div>
        <span className="min-w-[44px] text-right text-sm font-bold tabular-nums text-ink">
          {done} / {total}
        </span>
      </div>

      <ul className="mt-7 w-full space-y-3.5 rounded-3xl bg-canvas p-5">
        {STEPS.map((step, i) => {
          const complete = activeIndex === -1 || i < activeIndex;
          const active = i === activeIndex;
          return (
            <li key={step.label} className="flex items-center gap-3">
              <span
                className={cn(
                  'flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-colors',
                  complete ? 'bg-brand text-white' : active ? 'text-brand' : 'bg-line'
                )}
              >
                {complete ? (
                  <Check className="h-3 w-3" strokeWidth={3.5} />
                ) : active ? (
                  <Spinner className="h-5 w-5" />
                ) : null}
              </span>
              <span className={cn('text-sm', complete || active ? 'font-medium text-ink' : 'text-subtle')}>
                {step.label}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function FloatIcon({
  icon: Icon,
  className,
  delay,
}: {
  icon: React.ComponentType<{ className?: string }>;
  className: string;
  delay: string;
}) {
  return (
    <span
      className={cn('absolute flex h-12 w-12 items-center justify-center rounded-2xl shadow-card', className)}
      style={{ animation: `drift 2.4s ease-in-out ${delay} infinite` }}
    >
      <Icon className="h-6 w-6" />
    </span>
  );
}
