import { cn } from '@/lib/utils';
import type { CollectionStatus } from '@/types';

/** "Active" (live storefront) or "Hidden" (storefront switched off). */
export function StatusBadge({ status, className }: { status: CollectionStatus; className?: string }) {
  const hidden = status === 'archived';
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold',
        hidden ? 'bg-brand-50 text-brand' : 'bg-success-50 text-success',
        className
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', hidden ? 'bg-brand' : 'bg-success')} />
      {hidden ? 'Hidden' : 'Active'}
    </span>
  );
}
