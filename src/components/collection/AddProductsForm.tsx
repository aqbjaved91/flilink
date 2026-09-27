// =============================================================================
// FLILINK — Add More Products
// Paste more links into an existing collection. Each link is added and its
// details fetched with visible progress; links that fail stay on screen with
// their error so nothing is silently lost.
// =============================================================================

'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, CircleAlert } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { LinkFields, LinksInfoCard, emptyRows, validateRows, type LinkRow } from './LinkFields';
import { FetchingProgress } from './FetchingProgress';
import { FETCH_CONCURRENCY_LIMIT, MAX_LINKS_PER_COLLECTION, ROUTES } from '@/lib/constants';
import { runPool } from '@/lib/utils';

const DEFAULT_ROWS = 3;

interface AddProductsFormProps {
  collectionId: string;
  collectionName: string;
  existingUrls: string[];
}

export function AddProductsForm({ collectionId, collectionName, existingUrls }: AddProductsFormProps) {
  const router = useRouter();
  const toast = useToast();
  const room = MAX_LINKS_PER_COLLECTION - existingUrls.length;

  const [rows, setRows] = useState<LinkRow[]>(() => emptyRows(Math.max(1, Math.min(DEFAULT_ROWS, room))));
  const [showAllErrors, setShowAllErrors] = useState(false);
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  const existing = useMemo(() => new Set(existingUrls), [existingUrls]);
  const errors = useMemo(
    () => ({ ...serverErrors, ...validateRows(rows, existing) }),
    [rows, existing, serverErrors]
  );
  const filled = rows.filter((r) => r.url.trim());

  const updateRows: React.Dispatch<React.SetStateAction<LinkRow[]>> = (update) => {
    setRows(update);
    if (Object.keys(serverErrors).length) setServerErrors({});
    if (formError) setFormError('');
  };

  const submit = async () => {
    if (filled.length === 0) return;
    if (filled.some((r) => errors[r.id])) {
      setShowAllErrors(true);
      setFormError('Please fix the highlighted links.');
      return;
    }

    setProgress({ done: 0, total: filled.length });
    const startedAt = Date.now();
    const failures: Record<string, string> = {};

    await runPool(filled, FETCH_CONCURRENCY_LIMIT, async (row) => {
      try {
        const res = await fetch(`/api/collections/${collectionId}/products`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: row.url.trim() }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) failures[row.id] = data.error || 'Could not add this link';
      } catch {
        failures[row.id] = 'Network error — please try again';
      } finally {
        setProgress((p) => (p ? { ...p, done: p.done + 1 } : p));
      }
    });

    const wait = 1200 - (Date.now() - startedAt);
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));

    const added = filled.length - Object.keys(failures).length;
    router.refresh();

    if (Object.keys(failures).length === 0) {
      toast(`${added} product${added === 1 ? '' : 's'} added`);
      router.back();
      return;
    }

    // Keep only the links that failed, with their reasons
    if (added > 0) toast(`${added} product${added === 1 ? '' : 's'} added`);
    setRows(filled.filter((r) => failures[r.id]).map((r) => ({ ...r, touched: true })));
    setServerErrors(failures);
    setShowAllErrors(true);
    setFormError(`${Object.keys(failures).length} link${Object.keys(failures).length === 1 ? '' : 's'} couldn’t be added.`);
    setProgress(null);
  };

  if (progress) {
    return (
      <div className="flex min-h-dvh flex-col bg-white">
        <PageHeader title="Adding products" onBack={() => router.push(ROUTES.COLLECTION(collectionId))} />
        <FetchingProgress done={progress.done} total={progress.total} />
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col bg-white">
      <PageHeader title="Add More Products" fallbackHref={ROUTES.COLLECTION(collectionId)} />

      <div className="flex-1 px-4 pb-4 pt-5">
        <p className="mb-3 truncate px-1 text-sm text-muted">
          Adding to <span className="font-semibold text-ink">{collectionName}</span>
        </p>
        <LinksInfoCard />

        {room <= 0 ? (
          <p className="mt-5 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
            This collection already has the maximum of {MAX_LINKS_PER_COLLECTION} products.
          </p>
        ) : (
          <>
            {formError && (
              <div className="mt-4 flex items-start gap-2 rounded-2xl border border-red-100 bg-red-50 px-3.5 py-3 text-[13px] font-medium text-red-700">
                <CircleAlert className="mt-px h-4 w-4 shrink-0" />
                {formError}
              </div>
            )}
            <div className="mt-4">
              <LinkFields
                rows={rows}
                setRows={updateRows}
                errors={errors}
                showAllErrors={showAllErrors}
                maxRows={room}
              />
            </div>
          </>
        )}
      </div>

      {room > 0 && (
        <div className="pb-safe sticky bottom-0 border-t border-line/70 bg-white/95 px-4 pt-3 backdrop-blur-lg">
          <Button fullWidth className="mb-3" onClick={submit} disabled={filled.length === 0}>
            {filled.length > 1 ? `Add ${filled.length} Products` : 'Add Product'} <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
