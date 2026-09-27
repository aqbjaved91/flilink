// =============================================================================
// FLILINK — Collections library
// All / Active / Hidden tabs, search, and Sort by (newest, most / least
// clicked). Each row opens the collection overview or copies its link.
// =============================================================================

'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check, ChevronDown, ChevronRight, Copy, Plus, Search, SearchX, X } from 'lucide-react';
import { CollectionCover } from '@/components/ui/Logo';
import { useToast } from '@/components/ui/Toast';
import { ROUTES } from '@/lib/constants';
import { copyToClipboard, cn } from '@/lib/utils';
import type { CollectionWithStats } from '@/types';

type Tab = 'all' | 'active' | 'hidden';
type Sort = 'newest' | 'most' | 'least';

const SORTS: { value: Sort; label: string }[] = [
  { value: 'newest', label: 'Newest first' },
  { value: 'most', label: 'Most Clicked (High to Low)' },
  { value: 'least', label: 'Least Clicked (Low to High)' },
];

export function CollectionsLibrary({ collections }: { collections: CollectionWithStats[] }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('all');
  const [sort, setSort] = useState<Sort>('newest');
  const [sortOpen, setSortOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState('');
  const sortRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sortOpen) return;
    const close = (e: PointerEvent) => {
      if (!sortRef.current?.contains(e.target as Node)) setSortOpen(false);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [sortOpen]);

  const counts = useMemo(
    () => ({
      all: collections.length,
      active: collections.filter((c) => c.status !== 'archived').length,
      hidden: collections.filter((c) => c.status === 'archived').length,
    }),
    [collections]
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = collections.filter((c) => {
      if (tab === 'active' && c.status === 'archived') return false;
      if (tab === 'hidden' && c.status !== 'archived') return false;
      return !q || c.name.toLowerCase().includes(q);
    });
    if (sort === 'most') return [...list].sort((a, b) => b.product_click_count - a.product_click_count);
    if (sort === 'least') return [...list].sort((a, b) => a.product_click_count - b.product_click_count);
    return list; // server order is newest first
  }, [collections, tab, sort, query]);

  return (
    <div className="pb-32">
      <header className="sticky top-0 z-40 border-b border-line/70 bg-white/90 backdrop-blur-lg">
        <div className="flex h-14 items-center gap-2 px-2">
          {searching ? (
            <>
              <div className="flex h-10 flex-1 items-center gap-2 rounded-full bg-canvas px-4">
                <Search className="h-4 w-4 text-muted" />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search collections"
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
              <button
                onClick={() => router.push(ROUTES.DASHBOARD)}
                aria-label="Back to home"
                className="tap flex h-10 w-10 items-center justify-center rounded-full hover:bg-canvas"
              >
                <ArrowLeft className="h-5 w-5" strokeWidth={2.2} />
              </button>
              <h1 className="flex-1 text-[17px] font-bold text-ink">Collections</h1>
              <button
                onClick={() => setSearching(true)}
                aria-label="Search collections"
                className="tap flex h-10 w-10 items-center justify-center rounded-full hover:bg-canvas"
              >
                <Search className="h-5 w-5" />
              </button>
            </>
          )}
        </div>

        {/* Tabs + sort */}
        <div className="flex items-end justify-between px-4">
          <div className="no-scrollbar flex gap-5 overflow-x-auto">
            {(['all', 'active', 'hidden'] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  'relative whitespace-nowrap pb-3 pt-1 text-sm font-semibold capitalize transition-colors',
                  tab === t ? 'text-brand' : 'text-muted hover:text-ink'
                )}
              >
                {t} ({counts[t]})
                {tab === t && <span className="absolute inset-x-0 -bottom-px h-[2.5px] rounded-full bg-brand" />}
              </button>
            ))}
          </div>

          <div ref={sortRef} className="relative pb-2">
            <button
              onClick={() => setSortOpen((o) => !o)}
              className="tap flex h-9 items-center gap-1 rounded-full px-3 text-[13px] font-semibold text-ink-2 hover:bg-canvas"
            >
              Sort by
              <ChevronDown className={cn('h-4 w-4 transition-transform', sortOpen && 'rotate-180')} />
            </button>
            {sortOpen && (
              <div className="animate-pop absolute right-0 top-10 z-30 w-60 origin-top-right rounded-2xl border border-line bg-white p-1.5 shadow-float">
                {SORTS.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => {
                      setSort(s.value);
                      setSortOpen(false);
                    }}
                    className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] font-medium text-ink hover:bg-canvas"
                  >
                    {s.label}
                    {sort === s.value && (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand text-white">
                        <Check className="h-3 w-3" strokeWidth={3} />
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="px-4 pt-4">
        {collections.length === 0 ? (
          <div className="animate-fade-up mt-10 flex flex-col items-center text-center">
            <CollectionCover className="h-20 w-20" />
            <h2 className="mt-5 text-lg font-bold text-ink">No collections yet</h2>
            <p className="mt-1.5 max-w-[250px] text-sm text-muted">
              Create your first collection and it will show up here.
            </p>
            <Link
              href={ROUTES.NEW_COLLECTION}
              className="tap mt-6 flex h-12 items-center gap-2 rounded-2xl bg-brand px-6 text-sm font-semibold text-white shadow-brand"
            >
              <Plus className="h-4 w-4" strokeWidth={2.6} />
              Create Collection
            </Link>
          </div>
        ) : visible.length === 0 ? (
          <div className="animate-fade-up mt-16 flex flex-col items-center text-center text-muted">
            <SearchX className="h-10 w-10 text-subtle" />
            <p className="mt-3 text-sm font-medium">
              {query ? `No collections match “${query}”` : `No ${tab} collections`}
            </p>
          </div>
        ) : (
          <ul className="space-y-2.5">
            {visible.map((c, i) => (
              <li key={c.id} className="animate-fade-up" style={{ animationDelay: `${Math.min(i, 8) * 30}ms` }}>
                <LibraryRow collection={c} />
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}

/** One collection: tap to open the overview, or copy its storefront link right here. */
function LibraryRow({ collection: c }: { collection: CollectionWithStats }) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  const hidden = c.status === 'archived';

  const copyLink = async () => {
    const ok = await copyToClipboard(`${window.location.origin}${ROUTES.PUBLIC_COLLECTION(c.public_slug)}`);
    if (!ok) return toast('Could not copy the link', 'error');
    setCopied(true);
    toast(hidden ? 'Link copied — unhide the collection so it opens' : 'Collection link copied', hidden ? 'error' : 'success');
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="flex items-center gap-1 rounded-3xl bg-white p-3 pr-2 shadow-card">
      <Link href={ROUTES.COLLECTION(c.id)} className="tap flex min-w-0 flex-1 items-center gap-3.5">
        <CollectionCover className="h-[68px] w-[68px] rounded-2xl" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-bold text-ink">{c.name}</p>
          <p className="mt-0.5 text-[13px] text-muted">
            {c.product_count} product{c.product_count === 1 ? '' : 's'}
          </p>
          <p className="mt-0.5 flex items-center gap-1.5 text-[13px] text-muted">
            {c.product_click_count.toLocaleString('en-IN')} click{c.product_click_count === 1 ? '' : 's'}
            <span className="text-subtle">•</span>
            {hidden ? (
              <span className="rounded-full bg-brand-50 px-2 py-px text-xs font-semibold text-brand">Hidden</span>
            ) : (
              <span className="font-semibold text-success">Active</span>
            )}
          </p>
        </div>
      </Link>
      <button
        onClick={copyLink}
        aria-label={`Copy ${c.name} link`}
        className={cn(
          'tap flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors',
          copied ? 'bg-success-50 text-success' : 'bg-canvas text-ink-2 hover:bg-line'
        )}
      >
        {copied ? <Check className="h-[18px] w-[18px]" strokeWidth={2.6} /> : <Copy className="h-[18px] w-[18px]" />}
      </button>
      <Link
        href={ROUTES.COLLECTION(c.id)}
        aria-hidden
        tabIndex={-1}
        className="flex h-10 w-7 shrink-0 items-center justify-center text-subtle"
      >
        <ChevronRight className="h-5 w-5" />
      </Link>
    </div>
  );
}
