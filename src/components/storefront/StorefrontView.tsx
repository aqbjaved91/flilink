// =============================================================================
// FLILINK — Public storefront
// Header (back · logo · search · share) then straight into the product grid —
// no banner. Tapping a product opens its detail view; the detail is part of
// browser history (?p=<id>) so the phone's back button closes it.
// =============================================================================

'use client';

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { ArrowLeft, Search, SearchX, Share2, ShoppingBag, X } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import { useToast } from '@/components/ui/Toast';
import { copyToClipboard } from '@/lib/utils';
import { ProductCard } from './ProductCard';
import { ProductDetail } from './ProductDetail';
import type { StorefrontProduct } from './shared';

interface StorefrontViewProps {
  collectionName: string;
  products: StorefrontProduct[];
  initialProductId: string | null;
}

const noopSubscribe = () => () => {};

export function StorefrontView({ collectionName, products, initialProductId }: StorefrontViewProps) {
  const toast = useToast();
  const [openId, setOpenId] = useState<string | null>(
    initialProductId && products.some((p) => p.id === initialProductId) ? initialProductId : null
  );
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState('');
  // Whether the detail view was opened by us (pushState) or by a shared ?p= link
  const pushedDetail = useRef(false);

  const canGoBack = useSyncExternalStore(noopSubscribe, () => window.history.length > 1, () => false);
  // The detail view renders into document.body, so only after hydration
  const hydrated = useSyncExternalStore(noopSubscribe, () => true, () => false);

  useEffect(() => {
    const onPop = () => {
      pushedDetail.current = false;
      setOpenId(new URLSearchParams(window.location.search).get('p'));
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) => p.title?.toLowerCase().includes(q) || p.platform_name?.toLowerCase().includes(q)
    );
  }, [products, query]);

  const openProduct = (id: string) => {
    window.history.pushState(null, '', `?p=${id}`);
    pushedDetail.current = true;
    setOpenId(id);
  };

  const closeProduct = () => {
    if (pushedDetail.current) {
      window.history.back();
    } else {
      // Opened from a shared product link — drop ?p without leaving the page
      window.history.replaceState(null, '', window.location.pathname);
      setOpenId(null);
    }
  };

  const share = async (productId?: string) => {
    const url = `${window.location.origin}${window.location.pathname}${productId ? `?p=${productId}` : ''}`;
    const product = productId ? products.find((p) => p.id === productId) : null;
    const title = product?.title || collectionName;
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
      }
    }
    const ok = await copyToClipboard(url);
    toast(ok ? 'Link copied' : 'Could not copy the link', ok ? 'success' : 'error');
  };

  const openProductData = openId ? products.find((p) => p.id === openId) : null;

  return (
    <div className="mx-auto min-h-dvh max-w-md bg-canvas shadow-[0_0_40px_rgba(17,24,39,0.06)]">
      <header className="sticky top-0 z-40 border-b border-line/70 bg-white/90 backdrop-blur-lg">
        <div className="flex h-14 items-center gap-1 px-2">
          {searching ? (
            <>
              <div className="flex h-10 flex-1 items-center gap-2 rounded-full bg-canvas px-4">
                <Search className="h-4 w-4 text-muted" />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search products"
                  className="h-full w-full bg-transparent text-[15px] outline-none placeholder:text-subtle"
                />
              </div>
              <button
                onClick={() => {
                  setSearching(false);
                  setQuery('');
                }}
                aria-label="Close search"
                className="tap flex h-10 w-10 items-center justify-center rounded-full hover:bg-canvas"
              >
                <X className="h-5 w-5" />
              </button>
            </>
          ) : (
            <>
              {canGoBack && (
                <button
                  onClick={() => window.history.back()}
                  aria-label="Go back"
                  className="tap flex h-10 w-10 items-center justify-center rounded-full hover:bg-canvas"
                >
                  <ArrowLeft className="h-5 w-5" strokeWidth={2.2} />
                </button>
              )}
              <div className={canGoBack ? 'flex-1 pl-1' : 'flex-1 pl-3'}>
                <Logo size="sm" tagline={false} className="[&>span]:text-[22px]" />
              </div>
              <button
                onClick={() => setSearching(true)}
                aria-label="Search products"
                className="tap flex h-10 w-10 items-center justify-center rounded-full hover:bg-canvas"
              >
                <Search className="h-5 w-5" />
              </button>
              <button
                onClick={() => share()}
                aria-label="Share this collection"
                className="tap flex h-10 w-10 items-center justify-center rounded-full hover:bg-canvas"
              >
                <Share2 className="h-5 w-5" />
              </button>
            </>
          )}
        </div>
      </header>

      <main className="px-2.5 pb-8">
        <h1 className="truncate px-1.5 pb-2.5 pt-3.5 text-[15px] font-bold text-ink">
          {collectionName}
          <span className="font-medium text-muted">
            {' '}
            · {products.length} product{products.length === 1 ? '' : 's'}
          </span>
        </h1>

        {products.length === 0 ? (
          <div className="flex flex-col items-center py-24 text-center text-muted">
            <ShoppingBag className="h-10 w-10 text-subtle" />
            <p className="mt-3 text-sm font-medium">No products here yet</p>
          </div>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center py-24 text-center text-muted">
            <SearchX className="h-10 w-10 text-subtle" />
            <p className="mt-3 text-sm font-medium">No products match “{query}”</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2.5">
            {visible.map((p, i) => (
              <ProductCard key={p.id} product={p} eager={i < 4} onOpen={() => openProduct(p.id)} />
            ))}
          </div>
        )}

        <p className="pt-8 text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-subtle">
          Curated with <span className="text-ink">FLI</span>
          <span className="text-brand">LINK</span>
        </p>
      </main>

      {hydrated && openProductData && (
        <ProductDetail
          key={openProductData.id}
          product={openProductData}
          onClose={closeProduct}
          onShare={() => share(openProductData.id)}
        />
      )}
    </div>
  );
}
