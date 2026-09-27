// =============================================================================
// FLILINK — Sticky page header with back arrow
// =============================================================================

'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { ROUTES } from '@/lib/constants';

interface PageHeaderProps {
  title: string;
  /** Custom back behaviour. Default: browser back, or `fallbackHref` when
   *  the screen was opened directly (no in-app history). */
  onBack?: () => void;
  fallbackHref?: string;
  right?: React.ReactNode;
  children?: React.ReactNode;
}

export function PageHeader({ title, onBack, fallbackHref = ROUTES.DASHBOARD, right, children }: PageHeaderProps) {
  const router = useRouter();

  const handleBack = () => {
    if (onBack) return onBack();
    if (window.history.length > 1) router.back();
    else router.push(fallbackHref);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-white/90 backdrop-blur-lg">
      <div className="flex h-14 items-center gap-1 px-2">
        <button
          onClick={handleBack}
          aria-label="Go back"
          className="tap flex h-10 w-10 items-center justify-center rounded-full text-ink hover:bg-canvas"
        >
          <ArrowLeft className="h-5 w-5" strokeWidth={2.2} />
        </button>
        <h1 className="flex-1 truncate pl-1 text-[17px] font-bold text-ink">{title}</h1>
        {right && <div className="flex items-center pr-1">{right}</div>}
      </div>
      {children}
    </header>
  );
}
