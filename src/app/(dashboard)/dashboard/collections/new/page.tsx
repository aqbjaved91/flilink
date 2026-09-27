// =============================================================================
// FLILINK — Create Collection
// 1/2  Name the collection
// 2/2  Paste product links (9 boxes by default, "Add Another Product" for more)
//  →   Fetching product details (real per-product progress)
//  →   Collection Created: storefront link, Open Storefront, Copy Link, Home
// =============================================================================

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, CircleAlert, Sparkle } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import {
  LinkFields,
  LinksInfoCard,
  emptyRows,
  filledLinks,
  validateRows,
  type LinkRow,
} from '@/components/collection/LinkFields';
import { FetchingProgress } from '@/components/collection/FetchingProgress';
import { CollectionCreated } from '@/components/collection/CollectionCreated';
import { handwriting } from '@/lib/fonts';
import { DEFAULT_LINK_FIELDS, FETCH_CONCURRENCY_LIMIT, MAX_LINKS_PER_COLLECTION, ROUTES } from '@/lib/constants';
import { cn, runPool } from '@/lib/utils';
import type { CreateCollectionResult } from '@/types';

type Step = 'name' | 'links' | 'fetching' | 'done';

// Keep the progress screen up long enough to read, even when fetching is instant
const MIN_FETCH_SCREEN_MS = 1600;

export default function NewCollectionPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('name');
  const stepRef = useRef<Step>('name');
  useEffect(() => {
    stepRef.current = step;
  }, [step]);

  const [name, setName] = useState('');
  const [rows, setRows] = useState<LinkRow[]>(() => emptyRows(DEFAULT_LINK_FIELDS));
  const [showAllErrors, setShowAllErrors] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [progress, setProgress] = useState({ done: 0, total: 0, failed: 0 });
  const [publicUrl, setPublicUrl] = useState('');

  const errors = useMemo(() => validateRows(rows), [rows]);
  const links = filledLinks(rows);
  const hasErrors = Object.keys(errors).length > 0;

  // Hardware / browser back: links → name; after creation → home
  useEffect(() => {
    const onPop = () => {
      if (stepRef.current === 'links') setStep('name');
      else if (stepRef.current === 'fetching' || stepRef.current === 'done') router.replace(ROUTES.DASHBOARD);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [router]);

  const goToLinks = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    window.history.pushState(null, '', window.location.href);
    setStep('links');
    window.scrollTo(0, 0);
  };

  const create = useCallback(async () => {
    setSubmitError('');
    if (links.length === 0) {
      setSubmitError('Add at least one product link.');
      return;
    }
    if (hasErrors) {
      setShowAllErrors(true);
      setSubmitError('Please fix the highlighted links.');
      return;
    }

    setSubmitting(true);
    let result: CreateCollectionResult;
    try {
      const res = await fetch('/api/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), urls: links }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not create the collection.');
      result = data as CreateCollectionResult;
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Could not create the collection.');
      setSubmitting(false);
      return;
    }

    setSubmitting(false);
    setPublicUrl(`${window.location.origin}${ROUTES.PUBLIC_COLLECTION(result.public_slug)}`);
    setProgress({ done: 0, total: result.product_ids.length, failed: 0 });
    setStep('fetching');
    window.scrollTo(0, 0);

    const startedAt = Date.now();
    let failed = 0;
    await runPool(result.product_ids, FETCH_CONCURRENCY_LIMIT, async (id) => {
      try {
        const res = await fetch(`/api/products/${id}/metadata`, { method: 'POST' });
        const data = await res.json().catch(() => null);
        if (!res.ok || data?.product?.metadata_status === 'failed') failed++;
      } catch {
        failed++;
      } finally {
        setProgress((p) => ({ ...p, done: p.done + 1, failed }));
      }
    });

    const wait = MIN_FETCH_SCREEN_MS - (Date.now() - startedAt);
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));

    // Home / library must show the new collection with its fetched images
    router.refresh();
    if (stepRef.current === 'fetching') setStep('done');
  }, [hasErrors, links, name, router]);

  const goHome = () => router.replace(ROUTES.DASHBOARD);

  // ---------------------------------------------------------------------------

  if (step === 'done') {
    return (
      <div className="flex min-h-dvh flex-col bg-white">
        <CollectionCreated publicUrl={publicUrl} failedCount={progress.failed} onGoHome={goHome} />
      </div>
    );
  }

  if (step === 'fetching') {
    return (
      <div className="flex min-h-dvh flex-col bg-white">
        <PageHeader title="Creating your collection" onBack={goHome} />
        <FetchingProgress done={progress.done} total={progress.total} />
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col bg-white">
      <PageHeader
        title="Create Collection"
        onBack={step === 'links' ? () => window.history.back() : undefined}
      >
        <div className="flex items-center gap-3 px-4 pb-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
            <div
              className="h-full rounded-full bg-brand transition-[width] duration-500 ease-out"
              style={{ width: step === 'name' ? '50%' : '100%' }}
            />
          </div>
          <span className="text-xs font-bold tabular-nums text-ink">{step === 'name' ? '1 / 2' : '2 / 2'}</span>
        </div>
      </PageHeader>

      {step === 'name' ? (
        <form key="name" onSubmit={goToLinks} className="animate-fade-up flex flex-1 flex-col px-5 pt-8">
          <label htmlFor="collection-name" className="text-[15px] font-bold text-ink">
            Give your collection a name
          </label>
          <Field
            id="collection-name"
            className="mt-3"
            autoFocus
            maxLength={60}
            enterKeyHint="next"
            placeholder="e.g. Summer Outfits, Office Looks, etc."
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Button type="submit" fullWidth className="mt-5" disabled={!name.trim()}>
            Add Products <ArrowRight className="h-4 w-4" />
          </Button>

          {!name.trim() && (
            <div className="mt-20 flex flex-col items-center text-muted">
              <Sparkle className="h-6 w-6 fill-brand text-brand" />
              <p className={cn(handwriting.className, 'mt-2 -rotate-6 text-center text-[24px] leading-tight')}>
                Add a name to
                <br />
                continue
              </p>
            </div>
          )}
        </form>
      ) : (
        <div key="links" className="animate-fade-up flex flex-1 flex-col">
          <div className="flex-1 px-4 pb-4 pt-5">
            <LinksInfoCard />
            {submitError && (
              <div className="mt-4 flex items-start gap-2 rounded-2xl border border-red-100 bg-red-50 px-3.5 py-3 text-[13px] font-medium text-red-700">
                <CircleAlert className="mt-px h-4 w-4 shrink-0" />
                {submitError}
              </div>
            )}
            <div className="mt-4">
              <LinkFields
                rows={rows}
                setRows={(update) => {
                  setRows(update);
                  if (submitError) setSubmitError('');
                }}
                errors={errors}
                showAllErrors={showAllErrors}
                maxRows={MAX_LINKS_PER_COLLECTION}
                disabled={submitting}
              />
            </div>
          </div>

          <div className="pb-safe sticky bottom-0 border-t border-line/70 bg-white/95 px-4 pt-3 backdrop-blur-lg">
            <Button fullWidth className="mb-3" onClick={create} loading={submitting} disabled={links.length === 0}>
              Create Collection <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
