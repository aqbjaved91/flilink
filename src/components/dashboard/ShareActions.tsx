// =============================================================================
// FLILINK — Copy Link / Open Store button pair
// =============================================================================

'use client';

import { useState } from 'react';
import { Check, Copy, ExternalLink } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { copyToClipboard, cn } from '@/lib/utils';
import { ROUTES } from '@/lib/constants';

export function ShareActions({
  slug,
  openLabel = 'Open Store',
  className,
}: {
  slug: string;
  openLabel?: string;
  className?: string;
}) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    const ok = await copyToClipboard(`${window.location.origin}${ROUTES.PUBLIC_COLLECTION(slug)}`);
    if (!ok) return toast('Could not copy the link', 'error');
    setCopied(true);
    toast('Link copied');
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className={cn('grid grid-cols-2 gap-2.5', className)}>
      <button
        onClick={copy}
        className="tap flex h-12 items-center justify-center gap-2 rounded-2xl border border-line bg-white text-sm font-semibold text-ink hover:bg-canvas"
      >
        {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
        {copied ? 'Copied' : 'Copy Link'}
      </button>
      <a
        href={ROUTES.PUBLIC_COLLECTION(slug)}
        target="_blank"
        rel="noopener noreferrer"
        className="tap flex h-12 items-center justify-center gap-2 rounded-2xl bg-brand text-sm font-semibold text-white shadow-[0_6px_16px_rgba(242,85,61,0.28)] hover:bg-brand-600"
      >
        <ExternalLink className="h-4 w-4" />
        {openLabel}
      </a>
    </div>
  );
}
