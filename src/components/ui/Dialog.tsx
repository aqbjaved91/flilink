// =============================================================================
// FLILINK — Overlays
// Sheet (bottom sheet), ActionSheet (⋮ menus), ConfirmDialog (icon + Cancel /
// action) and RenameDialog (centred, keyboard-friendly).
// All animate in and out, lock page scroll while open, and render into
// document.body — a transformed / blurred ancestor (card animations, the
// frosted header) would otherwise trap position: fixed.
// =============================================================================

'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './Button';

const EXIT_MS = 240;
const noop = () => {};

/** Keeps an overlay mounted during its exit transition. */
function usePresence(open: boolean) {
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(false);

  if (open && !mounted) setMounted(true);

  useEffect(() => {
    if (open) {
      let inner = 0;
      const outer = requestAnimationFrame(() => {
        inner = requestAnimationFrame(() => setVisible(true));
      });
      return () => {
        cancelAnimationFrame(outer);
        cancelAnimationFrame(inner);
      };
    }
    const t = setTimeout(() => {
      setMounted(false);
      setVisible(false);
    }, EXIT_MS);
    return () => clearTimeout(t);
  }, [open]);

  return { mounted, show: open && visible };
}

function useOverlayBehaviour(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);
}

// -----------------------------------------------------------------------------
// Sheet
// -----------------------------------------------------------------------------

interface SheetProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export function Sheet({ open, onClose, children }: SheetProps) {
  const { mounted, show } = usePresence(open);
  useOverlayBehaviour(open, onClose);
  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[90]">
      <div
        onClick={onClose}
        className={cn(
          'absolute inset-0 bg-ink/45 transition-opacity duration-200',
          show ? 'opacity-100' : 'opacity-0'
        )}
      />
      <div className="absolute inset-x-0 bottom-0 mx-auto max-w-md">
        <div
          role="dialog"
          aria-modal="true"
          className={cn(
            'pb-safe rounded-t-[28px] bg-white shadow-float transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]',
            show ? 'translate-y-0' : 'translate-y-full'
          )}
        >
          <div className="mx-auto h-1 w-10 translate-y-2.5 rounded-full bg-line" />
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}

// -----------------------------------------------------------------------------
// ActionSheet
// -----------------------------------------------------------------------------

export interface ActionItem {
  label: string;
  icon: LucideIcon;
  onSelect: () => void;
  danger?: boolean;
}

interface ActionSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  items: ActionItem[];
}

export function ActionSheet({ open, onClose, title, items }: ActionSheetProps) {
  return (
    <Sheet open={open} onClose={onClose}>
      <div className="px-4 pb-4 pt-6">
        {title && (
          <p className="truncate px-3 pb-2 text-[13px] font-semibold text-subtle">{title}</p>
        )}
        {items.map((item) => (
          <button
            key={item.label}
            onClick={() => {
              onClose();
              // Let this sheet slide away before the next overlay appears
              setTimeout(item.onSelect, 160);
            }}
            className={cn(
              'tap flex w-full items-center gap-4 rounded-2xl px-3 py-3 text-left text-[15px] font-semibold hover:bg-canvas',
              item.danger ? 'text-brand' : 'text-ink'
            )}
          >
            <span
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-full',
                item.danger ? 'bg-brand-50' : 'bg-canvas'
              )}
            >
              <item.icon className="h-[18px] w-[18px]" />
            </span>
            {item.label}
          </button>
        ))}
        <Button variant="secondary" fullWidth className="mt-3 bg-canvas border-transparent" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </Sheet>
  );
}

// -----------------------------------------------------------------------------
// ConfirmDialog
// -----------------------------------------------------------------------------

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  icon?: LucideIcon;
  confirmLabel?: string;
  /** "danger" is reserved for irreversible account-level actions */
  confirmVariant?: 'primary' | 'danger';
  loading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  icon: Icon,
  confirmLabel = 'OK',
  confirmVariant = 'primary',
  loading,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <Sheet open={open} onClose={loading ? noop : onCancel}>
      <div className="px-6 pb-6 pt-8 text-center">
        {Icon && (
          <div
            className={cn(
              'mx-auto flex h-16 w-16 items-center justify-center rounded-full',
              confirmVariant === 'danger' ? 'bg-red-50 text-red-600' : 'bg-brand-50 text-brand'
            )}
          >
            <Icon className="h-7 w-7" />
          </div>
        )}
        <h2 className="mt-4 text-xl font-bold text-ink">{title}</h2>
        <p className="mx-auto mt-2 max-w-[290px] text-sm leading-relaxed text-muted">{message}</p>
        <div className="mt-7 grid grid-cols-2 gap-3">
          <Button variant="secondary" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button variant={confirmVariant} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Sheet>
  );
}

// -----------------------------------------------------------------------------
// RenameDialog (centred so the keyboard never covers it)
// -----------------------------------------------------------------------------

interface RenameDialogProps {
  open: boolean;
  initialName: string;
  loading?: boolean;
  onCancel: () => void;
  onSave: (name: string) => void;
}

export function RenameDialog({ open, initialName, loading, onCancel, onSave }: RenameDialogProps) {
  const { mounted, show } = usePresence(open);
  const onClose = loading ? noop : onCancel;
  useOverlayBehaviour(open, onClose);

  const [name, setName] = useState(initialName);
  const [wasOpen, setWasOpen] = useState(open);
  // Reset the field every time the dialog opens
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setName(initialName);
  }

  if (!mounted) return null;

  const trimmed = name.trim();
  const canSave = trimmed.length > 0 && trimmed !== initialName.trim();

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-start justify-center px-6 pt-[22vh]">
      <div
        onClick={onClose}
        className={cn(
          'absolute inset-0 bg-ink/45 transition-opacity duration-200',
          show ? 'opacity-100' : 'opacity-0'
        )}
      />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          'relative w-full max-w-[360px] rounded-3xl bg-white p-6 shadow-float transition-all duration-200',
          show ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        )}
      >
        <h2 className="text-lg font-bold text-ink">Rename collection</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (canSave) onSave(trimmed);
          }}
        >
          <input
            autoFocus
            value={name}
            maxLength={60}
            onChange={(e) => setName(e.target.value)}
            className="mt-4 h-13 w-full rounded-2xl border border-line px-4 text-ink outline-none focus:border-ink focus:ring-4 focus:ring-ink/5"
            placeholder="Collection name"
          />
          <div className="mt-6 grid grid-cols-2 gap-3">
            <Button type="button" variant="secondary" size="md" onClick={onCancel} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" size="md" disabled={!canSave} loading={loading}>
              Save
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
