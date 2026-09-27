// =============================================================================
// FLILINK — "Collection Created Successfully!" screen
// Storefront link with copy, Open Storefront, Copy Link and Go to Home.
// =============================================================================

'use client';

import { useState } from 'react';
import { Check, CircleAlert, Copy, ExternalLink, House } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { copyToClipboard, cn } from '@/lib/utils';

const CONFETTI_COLORS = ['#f2553d', '#ffb561', '#4f5bd5', '#16a34a', '#f472b6', '#facc15'];

// Fixed pseudo-random spread so server and client render identically
const PIECES = Array.from({ length: 22 }, (_, i) => {
  const angle = (i / 22) * Math.PI * 2;
  const distance = 90 + ((i * 37) % 60);
  return {
    dx: `${Math.round(Math.cos(angle) * distance)}px`,
    dy: `${Math.round(Math.sin(angle) * distance - 20)}px`,
    rot: `${(i * 67) % 360}deg`,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    round: i % 3 === 0,
    delay: `${(i % 5) * 40}ms`,
  };
});

interface CollectionCreatedProps {
  publicUrl: string;
  failedCount: number;
  onGoHome: () => void;
}

export function CollectionCreated({ publicUrl, failedCount, onGoHome }: CollectionCreatedProps) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    const ok = await copyToClipboard(publicUrl);
    if (!ok) return toast('Could not copy the link', 'error');
    setCopied(true);
    toast('Link copied');
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="flex flex-1 flex-col items-center px-6 pb-10 pt-16 text-center">
      <div className="relative flex h-32 w-32 items-center justify-center">
        {PIECES.map((p, i) => (
          <span
            key={i}
            className={cn('absolute left-1/2 top-1/2 h-2.5 w-1.5', p.round && 'h-2 w-2 rounded-full')}
            style={
              {
                background: p.color,
                '--dx': p.dx,
                '--dy': p.dy,
                '--rot': p.rot,
                animation: `confetti 1.1s cubic-bezier(0.16,1,0.3,1) ${p.delay} both`,
              } as React.CSSProperties
            }
          />
        ))}
        <span className="animate-pop text-[76px] leading-none" role="img" aria-label="Party popper">
          🎉
        </span>
      </div>

      <h1 className="animate-fade-up mt-6 text-[26px] font-extrabold leading-tight tracking-tight text-ink">
        Collection Created
        <br />
        Successfully!
      </h1>
      <p className="animate-fade-up mt-2 text-[15px] text-muted">Your collection is ready to share 🎉</p>

      {failedCount > 0 && (
        <p className="animate-fade-up mt-4 flex items-start gap-2 rounded-2xl bg-amber-50 px-3.5 py-2.5 text-left text-xs font-medium text-amber-800">
          <CircleAlert className="mt-px h-4 w-4 shrink-0" />
          We couldn’t fetch details for {failedCount} product{failedCount === 1 ? '' : 's'}. Their links still work
          — you can add a title, price and image from the collection anytime.
        </p>
      )}

      <div className="animate-fade-up mt-7 flex h-14 w-full items-center gap-2 rounded-2xl border border-line bg-white pl-4 pr-1.5">
        <span className="min-w-0 flex-1 truncate text-left text-sm font-medium text-ink">{publicUrl}</span>
        <button
          onClick={copy}
          aria-label="Copy storefront link"
          className="tap flex h-11 w-11 items-center justify-center rounded-xl text-ink-2 hover:bg-canvas"
        >
          {copied ? <Check className="h-5 w-5 text-success" /> : <Copy className="h-5 w-5" />}
        </button>
      </div>

      <a
        href={publicUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="tap animate-fade-up mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-brand text-[15px] font-semibold text-white shadow-brand hover:bg-brand-600"
      >
        <ExternalLink className="h-5 w-5" />
        Open Storefront
      </a>

      <div className="animate-fade-up mt-3 grid w-full grid-cols-2 gap-3">
        <button
          onClick={copy}
          className="tap flex h-[72px] flex-col items-center justify-center gap-1.5 rounded-2xl border border-line bg-white text-sm font-semibold text-ink hover:bg-canvas"
        >
          {copied ? <Check className="h-5 w-5 text-success" /> : <Copy className="h-5 w-5" />}
          {copied ? 'Copied' : 'Copy Link'}
        </button>
        <button
          onClick={onGoHome}
          className="tap flex h-[72px] flex-col items-center justify-center gap-1.5 rounded-2xl border border-line bg-white text-sm font-semibold text-ink hover:bg-canvas"
        >
          <House className="h-5 w-5" />
          Go to Home
        </button>
      </div>
    </div>
  );
}
