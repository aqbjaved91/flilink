// =============================================================================
// FLILINK — Brand wordmark
// "FLI" in ink + "LINK" in coral, optional "CREATOR STUDIO" tagline.
// =============================================================================

import { cn } from '@/lib/utils';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  tagline?: boolean;
  className?: string;
}

const SIZES = {
  sm: { word: 'text-lg', tag: 'text-[6px] tracking-[0.22em]' },
  md: { word: 'text-2xl', tag: 'text-[7.5px] tracking-[0.26em]' },
  lg: { word: 'text-4xl', tag: 'text-[10px] tracking-[0.3em]' },
};

export function Logo({ size = 'md', tagline = true, className }: LogoProps) {
  const s = SIZES[size];
  return (
    <div className={cn('inline-flex flex-col leading-none select-none', className)}>
      <span className={cn('font-black tracking-tight', s.word)}>
        <span className="text-ink">FLI</span>
        <span className="text-brand">LINK</span>
      </span>
      {tagline && (
        <span className={cn('mt-1 whitespace-nowrap font-semibold uppercase text-ink-2', s.tag)}>
          Creator Studio
        </span>
      )}
    </div>
  );
}

/**
 * Square brand tile used as every collection's cover image.
 * Drawn as SVG so the wordmark fits the tile exactly at any size.
 */
export function CollectionCover({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br from-brand-50 via-[#ffe9e4] to-brand-100',
        className
      )}
    >
      <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden>
        <text
          x="50"
          y="53"
          textAnchor="middle"
          fontSize="21"
          fontWeight="900"
          textLength="72"
          lengthAdjust="spacingAndGlyphs"
          style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}
        >
          <tspan fill="#111827">FLI</tspan>
          <tspan fill="#f2553d">LINK</tspan>
        </text>
        <text
          x="50"
          y="64"
          textAnchor="middle"
          fontSize="5.6"
          fontWeight="600"
          fill="#374151"
          textLength="72"
          lengthAdjust="spacing"
          style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}
        >
          CREATOR STUDIO
        </text>
      </svg>
    </div>
  );
}
