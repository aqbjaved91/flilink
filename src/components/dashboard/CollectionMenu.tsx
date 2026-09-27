// =============================================================================
// FLILINK — Collection ⋮ menu (bottom action sheet)
// Home card:  Rename · Edit (opens overview) · Delete
// Overview:   Rename · Hide / Unhide collection · Delete
// Owns its dialogs and API calls; parents get change callbacks.
// =============================================================================

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, EllipsisVertical, PencilLine, SquarePen, Trash2 } from 'lucide-react';
import { ActionSheet, ConfirmDialog, RenameDialog, type ActionItem } from '@/components/ui/Dialog';
import { useToast } from '@/components/ui/Toast';
import { ROUTES } from '@/lib/constants';
import { cn } from '@/lib/utils';
import type { CollectionStatus } from '@/types';

interface CollectionMenuProps {
  collection: { id: string; name: string; status: CollectionStatus };
  variant: 'card' | 'overview';
  onRenamed?: (name: string) => void;
  onStatusChange?: (status: CollectionStatus) => void;
  onDeleted?: () => void;
  className?: string;
}

async function patchCollection(id: string, body: Record<string, string>) {
  const res = await fetch(`/api/collections/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Something went wrong. Please try again.');
}

export function CollectionMenu({
  collection,
  variant,
  onRenamed,
  onStatusChange,
  onDeleted,
  className,
}: CollectionMenuProps) {
  const router = useRouter();
  const toast = useToast();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [dialog, setDialog] = useState<'rename' | 'hide' | 'delete' | null>(null);
  const [busy, setBusy] = useState(false);
  const hidden = collection.status === 'archived';

  const run = async (action: () => Promise<void>, success: string, after?: () => void) => {
    setBusy(true);
    try {
      await action();
      setDialog(null);
      toast(success);
      after?.();
      router.refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Something went wrong.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const rename = (name: string) =>
    run(() => patchCollection(collection.id, { name }), 'Collection renamed', () => onRenamed?.(name));

  const setStatus = (status: CollectionStatus) =>
    run(
      () => patchCollection(collection.id, { status }),
      status === 'archived' ? 'Collection hidden' : 'Collection is live again',
      () => onStatusChange?.(status)
    );

  const remove = () =>
    run(
      async () => {
        const res = await fetch(`/api/collections/${collection.id}`, { method: 'DELETE' });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Could not delete the collection.');
      },
      'Collection deleted',
      onDeleted
    );

  const items: ActionItem[] = [
    { label: 'Rename', icon: PencilLine, onSelect: () => setDialog('rename') },
    variant === 'card'
      ? { label: 'Edit', icon: SquarePen, onSelect: () => router.push(ROUTES.COLLECTION(collection.id)) }
      : hidden
        ? { label: 'Unhide Collection', icon: Eye, onSelect: () => setStatus('active') }
        : { label: 'Hide Collection', icon: EyeOff, onSelect: () => setDialog('hide') },
    { label: 'Delete', icon: Trash2, onSelect: () => setDialog('delete'), danger: true },
  ];

  return (
    <div className={className}>
      <button
        onClick={() => setSheetOpen(true)}
        aria-label="Collection options"
        className={cn(
          'tap flex h-9 w-9 items-center justify-center rounded-full text-ink-2 hover:bg-line',
          variant === 'card' && 'bg-canvas'
        )}
      >
        <EllipsisVertical className="h-[18px] w-[18px]" />
      </button>

      <ActionSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={collection.name}
        items={items}
      />
      <RenameDialog
        open={dialog === 'rename'}
        initialName={collection.name}
        loading={busy}
        onCancel={() => setDialog(null)}
        onSave={rename}
      />
      <ConfirmDialog
        open={dialog === 'hide'}
        icon={EyeOff}
        title="Hide this collection?"
        message="Its storefront link will stop working until you unhide it. Your products and clicks stay safe."
        confirmLabel="Hide"
        loading={busy}
        onCancel={() => setDialog(null)}
        onConfirm={() => setStatus('archived')}
      />
      <ConfirmDialog
        open={dialog === 'delete'}
        icon={Trash2}
        title="Delete this collection?"
        message={`Are you sure you want to delete “${collection.name}”? Its storefront link will stop working. This can’t be undone.`}
        confirmLabel="OK"
        loading={busy}
        onCancel={() => setDialog(null)}
        onConfirm={remove}
      />
    </div>
  );
}
