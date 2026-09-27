// =============================================================================
// FLILINK — Collection overview
// Collection summary + total product clicks, Copy Collection Link / Open
// Storefront, and the product list with per-product clicks.
// Product ⋮ → Edit / Hide (Unhide) / Delete. "Reorder" → drag handles; the
// new order saves automatically. "Add More Products" at the end of the list.
// =============================================================================

'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { restrictToParentElement, restrictToVerticalAxis } from '@dnd-kit/modifiers';
import {
  ArrowUpDown,
  CalendarDays,
  Check,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  MousePointerClick,
  PackageOpen,
  PencilLine,
  PlusCircle,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { CollectionCover } from '@/components/ui/Logo';
import { ActionSheet, ConfirmDialog } from '@/components/ui/Dialog';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { CollectionMenu } from '@/components/dashboard/CollectionMenu';
import { StatusBadge } from '@/components/dashboard/StatusBadge';
import { ProductRow } from './ProductRow';
import { FETCH_CONCURRENCY_LIMIT, ROUTES } from '@/lib/constants';
import { copyToClipboard, cn, runPool, timeAgo } from '@/lib/utils';
import type { Collection, ProductWithClicks } from '@/types';

interface CollectionOverviewProps {
  collection: Collection;
  products: ProductWithClicks[];
}

type SaveState = 'idle' | 'saving' | 'saved';

// A product stuck in "processing" this long was abandoned mid-fetch
const STALE_PROCESSING_MS = 90_000;

async function request(url: string, init: RequestInit) {
  const res = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Something went wrong. Please try again.');
  return data;
}

export function CollectionOverview({ collection: initialCollection, products: initialProducts }: CollectionOverviewProps) {
  const router = useRouter();
  const toast = useToast();

  // Local state is the source of truth while this screen is open; it is
  // remounted (keyed by id) with fresh server data on every visit.
  const [collection, setCollection] = useState(initialCollection);
  const [products, setProducts] = useState(initialProducts);

  const [reordering, setReordering] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  // The sheet keeps showing its product while it animates closed
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuFor, setMenuFor] = useState<ProductWithClicks | null>(null);
  const [confirm, setConfirm] = useState<{ type: 'hide' | 'delete'; product: ProductWithClicks } | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const totalClicks = products.reduce((sum, p) => sum + p.click_count, 0);
  const hidden = collection.status === 'archived';
  const storefrontPath = ROUTES.PUBLIC_COLLECTION(collection.public_slug);

  // ---------------------------------------------------------------------------
  // ⟳ Refresh: pull the latest clicks and product details from the server.
  // Other router.refresh() calls only clear caches for the other screens —
  // only this button adopts the fresh server data into the screen.
  // ---------------------------------------------------------------------------
  const [refreshing, startRefresh] = useTransition();
  const [adoptServerData, setAdoptServerData] = useState(false);
  const [lastServerProducts, setLastServerProducts] = useState(initialProducts);
  if (initialProducts !== lastServerProducts) {
    setLastServerProducts(initialProducts);
    if (adoptServerData) {
      setAdoptServerData(false);
      setProducts(initialProducts);
      setCollection(initialCollection);
    }
  }

  const refresh = () => {
    if (saveState === 'saving') return;
    setAdoptServerData(true);
    startRefresh(() => router.refresh());
  };

  // ---------------------------------------------------------------------------
  // Finish fetching details for products whose fetch never completed
  // (e.g. the creator left the "Fetching products" screen early)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const now = Date.now();
    const stuck = initialProducts.filter(
      (p) =>
        p.metadata_status === 'pending' ||
        (p.metadata_status === 'processing' && now - new Date(p.updated_at).getTime() > STALE_PROCESSING_MS)
    );
    if (stuck.length === 0) return;

    let active = true;
    runPool(stuck, FETCH_CONCURRENCY_LIMIT, async (p) => {
      const data = await request(`/api/products/${p.id}/metadata`, { method: 'POST' }).catch(() => null);
      if (!active || !data?.product) return;
      setProducts((list) =>
        list.map((item) => (item.id === p.id ? { ...item, ...data.product, click_count: item.click_count } : item))
      );
    }).then(() => active && router.refresh());

    return () => {
      active = false;
    };
  }, [initialProducts, router]);

  // ---------------------------------------------------------------------------
  // Reorder — every drop is saved automatically (queued so saves never race)
  // ---------------------------------------------------------------------------
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const lastSavedOrder = useRef(initialProducts.map((p) => p.id));
  const saveQueue = useRef<Promise<void>>(Promise.resolve());
  const pendingSaves = useRef(0);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // When a ⟳ refresh finishes: the server order is now the saved order
  const wasRefreshing = useRef(false);
  useEffect(() => {
    if (wasRefreshing.current && !refreshing) {
      lastSavedOrder.current = products.map((p) => p.id);
      toast('Clicks and details are up to date');
    }
    wasRefreshing.current = refreshing;
  }, [refreshing, products, toast]);

  const saveOrder = useCallback(
    (order: string[]) => {
      pendingSaves.current++;
      setSaveState('saving');
      if (savedTimer.current) clearTimeout(savedTimer.current);

      saveQueue.current = saveQueue.current.then(async () => {
        let ok = true;
        try {
          await request(`/api/collections/${collection.id}/products`, {
            method: 'PUT',
            body: JSON.stringify({ order }),
          });
          lastSavedOrder.current = order;
        } catch (err) {
          ok = false;
          toast(err instanceof Error ? err.message : 'Could not save the new order', 'error');
          const saved = lastSavedOrder.current;
          setProducts((list) =>
            [...list].sort((a, b) => saved.indexOf(a.id) - saved.indexOf(b.id))
          );
        } finally {
          pendingSaves.current--;
          if (pendingSaves.current === 0) {
            setSaveState(ok ? 'saved' : 'idle');
            if (ok) {
              router.refresh();
              savedTimer.current = setTimeout(() => setSaveState('idle'), 1800);
            }
          }
        }
      });
    },
    [collection.id, router, toast]
  );

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = products.findIndex((p) => p.id === active.id);
    const to = products.findIndex((p) => p.id === over.id);
    if (from < 0 || to < 0) return;
    const next = arrayMove(products, from, to);
    setProducts(next);
    saveOrder(next.map((p) => p.id));
  };

  // ---------------------------------------------------------------------------
  // Product actions
  // ---------------------------------------------------------------------------
  const setProductHidden = async (product: ProductWithClicks, isHidden: boolean) => {
    setBusy(true);
    try {
      await request(`/api/products/${product.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_hidden: isHidden }),
      });
      setProducts((list) => list.map((p) => (p.id === product.id ? { ...p, is_hidden: isHidden } : p)));
      setConfirm(null);
      toast(isHidden ? 'Product hidden from your storefront' : 'Product is visible again');
      router.refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not update the product', 'error');
    } finally {
      setBusy(false);
    }
  };

  const deleteProduct = async (product: ProductWithClicks) => {
    setBusy(true);
    try {
      await request(`/api/products/${product.id}`, { method: 'DELETE' });
      setProducts((list) => list.filter((p) => p.id !== product.id));
      lastSavedOrder.current = lastSavedOrder.current.filter((id) => id !== product.id);
      setConfirm(null);
      toast('Product deleted');
      router.refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not delete the product', 'error');
    } finally {
      setBusy(false);
    }
  };

  const retryFetch = async (product: ProductWithClicks) => {
    setProducts((list) => list.map((p) => (p.id === product.id ? { ...p, metadata_status: 'processing' } : p)));
    try {
      const data = await request(`/api/products/${product.id}/metadata`, { method: 'POST' });
      const updated = data.product as ProductWithClicks | null;
      setProducts((list) =>
        list.map((p) =>
          p.id === product.id ? { ...p, ...(updated ?? {}), click_count: p.click_count, is_hidden: p.is_hidden } : p
        )
      );
      if (updated?.image_url && updated?.price) toast('Product details updated');
      else toast('The store didn’t share all details — you can add them with Edit Product', 'error');
      router.refresh();
    } catch (err) {
      setProducts((list) => list.map((p) => (p.id === product.id ? product : p)));
      toast(err instanceof Error ? err.message : 'Could not fetch details', 'error');
    }
  };

  const copyLink = async () => {
    const ok = await copyToClipboard(`${window.location.origin}${storefrontPath}`);
    if (!ok) return toast('Could not copy the link', 'error');
    setCopied(true);
    toast('Link copied');
    setTimeout(() => setCopied(false), 1800);
  };

  // ---------------------------------------------------------------------------

  return (
    <div className="pb-12">
      <PageHeader
        title="Collection Overview"
        fallbackHref={ROUTES.COLLECTIONS}
        right={
          <div className="flex items-center gap-0.5">
            <button
              onClick={refresh}
              disabled={refreshing}
              aria-label="Refresh clicks and details"
              className="tap flex h-9 w-9 items-center justify-center rounded-full text-ink-2 hover:bg-line"
            >
              <RefreshCw className={cn('h-[18px] w-[18px]', refreshing && 'animate-spin text-brand')} />
            </button>
            <CollectionMenu
              collection={collection}
              variant="overview"
              onRenamed={(name) => setCollection((c) => ({ ...c, name }))}
              onStatusChange={(status) => setCollection((c) => ({ ...c, status }))}
              onDeleted={() => router.replace(ROUTES.DASHBOARD)}
            />
          </div>
        }
      />

      {/* Summary */}
      <section className="px-4 pt-4">
        <div className="animate-fade-up rounded-[28px] bg-white p-4 shadow-card">
          <div className="flex gap-4">
            <CollectionCover className="h-[92px] w-[92px]" />
            <div className="min-w-0 flex-1 py-0.5">
              <h2 className="line-clamp-2 text-[18px] font-bold leading-snug text-ink">{collection.name}</h2>
              <p className="mt-0.5 text-sm text-muted">
                {products.length} product{products.length === 1 ? '' : 's'}
              </p>
              <StatusBadge status={collection.status} className="mt-1.5" />
              <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted">
                <CalendarDays className="h-3.5 w-3.5" />
                Created {timeAgo(collection.created_at)}
              </p>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3.5 rounded-2xl border border-emerald-100/80 bg-gradient-to-r from-emerald-50/80 to-white p-3.5">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100/80 text-emerald-600">
              <MousePointerClick className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[22px] font-extrabold leading-none tabular-nums text-ink">
                {totalClicks.toLocaleString('en-IN')}
              </p>
              <p className="mt-1 text-[13px] text-muted">Product Clicks</p>
            </div>
          </div>

          {hidden && (
            <p className="mt-3 flex items-start gap-2 rounded-2xl bg-brand-50 px-3.5 py-2.5 text-xs font-medium text-brand-700">
              <EyeOff className="mt-px h-4 w-4 shrink-0" />
              This collection is hidden, so its storefront link is switched off. Use ⋮ above to unhide it.
            </p>
          )}

          <button
            onClick={copyLink}
            className="tap mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-line bg-white text-sm font-semibold text-ink hover:bg-canvas"
          >
            {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Copied' : 'Copy Collection Link'}
          </button>
          <a
            href={storefrontPath}
            target="_blank"
            rel="noopener noreferrer"
            aria-disabled={hidden}
            onClick={(e) => {
              if (hidden) {
                e.preventDefault();
                toast('Unhide the collection to open its storefront', 'error');
              }
            }}
            className={cn(
              'tap mt-2.5 flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-sm font-semibold text-white',
              hidden ? 'bg-[#c7cad1]' : 'bg-brand shadow-[0_6px_16px_rgba(242,85,61,0.28)] hover:bg-brand-600'
            )}
          >
            <ExternalLink className="h-4 w-4" />
            Open Storefront
          </a>
        </div>
      </section>

      {/* Products */}
      <section className="px-4 pt-6">
        <div className="flex h-9 items-center justify-between px-1">
          <h3 className="text-base font-bold text-ink">Products ({products.length})</h3>
          <div className="flex items-center gap-3">
            {saveState === 'saving' && (
              <span className="flex items-center gap-1.5 text-xs font-medium text-muted">
                <Spinner className="h-3.5 w-3.5" /> Saving
              </span>
            )}
            {saveState === 'saved' && (
              <span className="animate-fade-in flex items-center gap-1 text-xs font-semibold text-success">
                <Check className="h-3.5 w-3.5" strokeWidth={3} /> Saved
              </span>
            )}
            {products.length > 1 && (
              <button
                onClick={() => setReordering((r) => !r)}
                className="tap flex h-9 items-center gap-1.5 rounded-full px-2 text-sm font-bold text-brand"
              >
                {reordering ? (
                  'Done'
                ) : (
                  <>
                    <ArrowUpDown className="h-4 w-4" /> Reorder
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {reordering && (
          <p className="animate-fade-in mt-1 px-1 text-xs text-muted">
            Drag the handle to move a product. Changes save automatically.
          </p>
        )}

        {products.length === 0 ? (
          <div className="mt-3 flex flex-col items-center rounded-3xl bg-white px-6 py-10 text-center shadow-card">
            <PackageOpen className="h-10 w-10 text-subtle" />
            <p className="mt-3 text-sm font-semibold text-ink">No products in this collection</p>
            <p className="mt-1 text-xs text-muted">Add product links to fill your storefront.</p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis, restrictToParentElement]}
            onDragStart={() => navigator.vibrate?.(8)}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={products.map((p) => p.id)} strategy={verticalListSortingStrategy}>
              <ul className="mt-3 space-y-2.5">
                {products.map((p) => (
                  <ProductRow
                    key={p.id}
                    product={p}
                    reordering={reordering}
                    onOpenMenu={() => {
                      setMenuFor(p);
                      setMenuOpen(true);
                    }}
                    onRetryFetch={() => retryFetch(p)}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        )}

        {!reordering && (
          <Link
            href={ROUTES.ADD_PRODUCTS(collection.id)}
            className="tap mt-4 flex h-14 items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-brand/40 bg-brand-50/50 text-sm font-bold text-brand hover:bg-brand-50"
          >
            <PlusCircle className="h-5 w-5 fill-brand text-white" />
            Add More Products
          </Link>
        )}
      </section>

      {/* Product ⋮ sheet */}
      <ActionSheet
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        title={menuFor?.title ?? undefined}
        items={
          menuFor
            ? [
                {
                  label: 'Edit Product',
                  icon: PencilLine,
                  onSelect: () => router.push(ROUTES.EDIT_PRODUCT(collection.id, menuFor.id)),
                },
                menuFor.is_hidden
                  ? { label: 'Unhide Product', icon: Eye, onSelect: () => setProductHidden(menuFor, false) }
                  : { label: 'Hide Product', icon: EyeOff, onSelect: () => setConfirm({ type: 'hide', product: menuFor }) },
                {
                  label: 'Delete Product',
                  icon: Trash2,
                  danger: true,
                  onSelect: () => setConfirm({ type: 'delete', product: menuFor }),
                },
              ]
            : []
        }
      />

      <ConfirmDialog
        open={confirm?.type === 'hide'}
        icon={EyeOff}
        title="Hide this product?"
        message="This product will be hidden from your public storefront. You can unhide it anytime."
        confirmLabel="Hide Product"
        loading={busy}
        onCancel={() => setConfirm(null)}
        onConfirm={() => confirm && setProductHidden(confirm.product, true)}
      />
      <ConfirmDialog
        open={confirm?.type === 'delete'}
        icon={Trash2}
        title="Delete this product?"
        message="This product will be permanently removed from this collection."
        confirmLabel="Delete Product"
        loading={busy}
        onCancel={() => setConfirm(null)}
        onConfirm={() => confirm && deleteProduct(confirm.product)}
      />
    </div>
  );
}
