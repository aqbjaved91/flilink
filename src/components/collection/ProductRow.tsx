// =============================================================================
// FLILINK — Product row in the collection overview
// Image, title, store, price + discount, Copy link, clicks on the right, ⋮ for
// actions.
// In reorder mode a drag handle appears and the row becomes sortable.
// =============================================================================

'use client';

import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Check, CircleAlert, Copy, EllipsisVertical, EyeOff, GripVertical, RotateCw } from 'lucide-react';
import { ProductImage } from '@/components/ui/ProductImage';
import { useToast } from '@/components/ui/Toast';
import { copyToClipboard, cn, discountPercent, productSource } from '@/lib/utils';
import type { ProductWithClicks } from '@/types';

interface ProductRowProps {
  product: ProductWithClicks;
  reordering: boolean;
  onOpenMenu: () => void;
  onRetryFetch: () => void;
}

export function ProductRow({ product: p, reordering, onOpenMenu, onRetryFetch }: ProductRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: p.id, disabled: !reordering });

  const toast = useToast();
  const [copied, setCopied] = useState(false);

  const copyLink = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const ok = await copyToClipboard(p.original_url);
    if (!ok) return toast('Could not copy the link', 'error');
    setCopied(true);
    toast('Product link copied');
    setTimeout(() => setCopied(false), 1600);
  };

  const fetching = p.metadata_status === 'pending' || p.metadata_status === 'processing';
  // Store refused or timed out — let the creator try again later
  const canRetry = !fetching && (!p.image_url || !p.price);
  const source = productSource(p.platform_name, p.original_url);
  const pct = discountPercent(p.price, p.original_price);

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn('relative list-none', isDragging && 'z-20')}
    >
      <div
        onClick={reordering ? undefined : onOpenMenu}
        className={cn(
          'flex gap-3 rounded-3xl bg-white p-3 shadow-card transition-[box-shadow,transform] duration-200',
          isDragging && 'scale-[1.02] shadow-float ring-2 ring-brand/25',
          !reordering && 'cursor-pointer active:scale-[0.99]'
        )}
      >
        {reordering && (
          <button
            ref={setActivatorNodeRef}
            {...attributes}
            {...listeners}
            aria-label={`Drag to reorder ${p.title ?? 'product'}`}
            className="-my-3 -ml-3 flex w-10 shrink-0 cursor-grab touch-none items-center justify-center rounded-l-3xl text-ink-2 active:cursor-grabbing"
          >
            <GripVertical className="h-5 w-5" />
          </button>
        )}

        <ProductImage
          src={p.image_url}
          alt={p.title ?? ''}
          className={cn('h-[92px] w-[74px] shrink-0 rounded-2xl', p.is_hidden && 'opacity-40 grayscale')}
        />

        <div className="min-w-0 flex-1 py-0.5">
          {fetching ? (
            <div className="space-y-2 pt-1">
              <div className="skeleton h-3.5 w-11/12 rounded-md" />
              <div className="skeleton h-3.5 w-2/3 rounded-md" />
              <p className="pt-1 text-xs text-muted">Fetching details…</p>
            </div>
          ) : (
            <>
              <p
                className={cn(
                  'line-clamp-2 text-sm font-semibold leading-snug',
                  p.is_hidden ? 'text-muted' : 'text-ink'
                )}
              >
                {p.title || source}
              </p>
              <p className="mt-1 flex items-center gap-1.5 text-xs text-muted">
                <span className="truncate">{source}</span>
                {p.is_hidden && (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-canvas px-2 py-0.5 text-[11px] font-semibold text-ink-2">
                    <EyeOff className="h-3 w-3" /> Hidden
                  </span>
                )}
              </p>
              {p.price ? (
                <div className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-1">
                  <span className="text-[15px] font-bold text-ink">{p.price}</span>
                  {p.original_price && pct && (
                    <span className="text-xs text-subtle line-through">{p.original_price}</span>
                  )}
                  {pct && (
                    <span className="rounded-md bg-success px-1.5 py-0.5 text-[10px] font-bold text-white">
                      {pct}% OFF
                    </span>
                  )}
                </div>
              ) : null}
              {canRetry && !reordering && (
                <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-amber-700">
                  <CircleAlert className="h-3.5 w-3.5" />
                  {!p.image_url && !p.price ? 'Details missing' : !p.price ? 'Price missing' : 'Image missing'}
                </p>
              )}
              {!reordering && (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <button
                    onClick={copyLink}
                    aria-label="Copy product link"
                    className={cn(
                      'tap flex h-7 items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold transition-colors',
                      copied ? 'bg-success-50 text-success' : 'bg-canvas text-ink-2 hover:bg-line'
                    )}
                  >
                    {copied ? <Check className="h-3.5 w-3.5" strokeWidth={2.8} /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? 'Copied' : 'Copy link'}
                  </button>
                  {canRetry && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRetryFetch();
                      }}
                      className="tap flex h-7 items-center gap-1 rounded-full bg-brand-50 px-2.5 text-xs font-bold text-brand"
                    >
                      <RotateCw className="h-3 w-3" strokeWidth={2.6} /> Retry
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex shrink-0 flex-col items-end justify-between">
          {reordering ? (
            <span className="h-9" />
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenMenu();
              }}
              aria-label="Product options"
              className="tap -mr-1.5 -mt-1.5 flex h-9 w-9 items-center justify-center rounded-full text-ink-2 hover:bg-canvas"
            >
              <EllipsisVertical className="h-[18px] w-[18px]" />
            </button>
          )}
          <div className="text-right">
            <p className="text-lg font-extrabold leading-none tabular-nums text-ink">
              {p.click_count.toLocaleString('en-IN')}
            </p>
            <p className="mt-1 text-[11px] font-medium text-muted">click{p.click_count === 1 ? '' : 's'}</p>
          </div>
        </div>
      </div>
    </li>
  );
}
