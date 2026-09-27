// =============================================================================
// FLILINK — Auth hero illustration
// Floating product cards around a link badge: "many links, one collection".
// Pure CSS/SVG so it renders instantly with no network images.
// =============================================================================

import { Link2 } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';

const CARDS = [
  { cls: 'left-[6%] top-[14%] -rotate-12', tone: 'from-[#ffd9cf] to-[#ffb8a6]', price: '₹749', delay: '0s' },
  { cls: 'right-[7%] top-[8%] rotate-[10deg]', tone: 'from-[#d8e6ff] to-[#b3ccff]', price: '₹1,299', delay: '0.6s' },
  { cls: 'left-[10%] bottom-[10%] rotate-[8deg]', tone: 'from-[#dcf5e6] to-[#b5e8c9]', price: '₹499', delay: '1.2s' },
  { cls: 'right-[9%] bottom-[14%] -rotate-[9deg]', tone: 'from-[#fff0c7] to-[#ffe08a]', price: '₹629', delay: '1.8s' },
];

export function AuthHero({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={
        compact
          ? 'relative flex h-40 items-center justify-center overflow-hidden'
          : 'relative flex flex-1 items-center justify-center overflow-hidden min-h-[300px]'
      }
    >
      {/* Soft glow */}
      <div className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand/15 blur-3xl" />

      {!compact &&
        CARDS.map((c, i) => (
          <div
            key={i}
            className={`absolute ${c.cls}`}
            style={{ animation: `drift 4s ease-in-out ${c.delay} infinite` }}
          >
            <div className="w-[84px] rounded-2xl bg-white p-1.5 shadow-float">
              <div className={`h-[72px] rounded-xl bg-gradient-to-br ${c.tone}`} />
              <div className="mt-1.5 h-1.5 w-12 rounded-full bg-line" />
              <div className="mt-1 flex items-center justify-between px-0.5 pb-0.5">
                <span className="text-[10px] font-bold text-ink">{c.price}</span>
                <span className="rounded bg-success px-1 text-[7px] font-bold text-white">OFF</span>
              </div>
            </div>
          </div>
        ))}

      <div className="relative flex flex-col items-center">
        {!compact && (
          <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-[28px] bg-brand text-white shadow-brand animate-float">
            <Link2 className="h-10 w-10" strokeWidth={2.4} />
          </div>
        )}
        <Logo size={compact ? 'md' : 'lg'} />
      </div>
    </div>
  );
}
