// =============================================================================
// FLILINK — Product link fields
// Used by Create Collection (step 2) and Add More Products.
// Each box accepts a pasted link (share text is cleaned to its URL), has a
// one-tap paste button, and shows inline errors for invalid / duplicate links.
// =============================================================================

'use client';

import { useRef } from 'react';
import { ClipboardPaste, Link2, PlusCircle, X } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { CLIPBOARD_MESSAGES, readClipboard } from '@/lib/clipboard';
import { cleanLinkInput, cn, generateInputId, isValidUrl, normalizeUrl } from '@/lib/utils';

export interface LinkRow {
  id: string;
  url: string;
  touched?: boolean;
}

export function emptyRows(count: number): LinkRow[] {
  return Array.from({ length: count }, () => ({ id: generateInputId(), url: '' }));
}

/**
 * Validate every filled row. Returns row id → error message.
 * `existing` holds normalised links already in the collection.
 */
export function validateRows(rows: LinkRow[], existing: Set<string> = new Set()): Record<string, string> {
  const errors: Record<string, string> = {};
  const seen = new Set<string>();
  for (const row of rows) {
    const url = row.url.trim();
    if (!url) continue;
    if (!isValidUrl(url) || !new URL(url).hostname.includes('.')) {
      errors[row.id] = 'Enter a valid product link (https://…)';
      continue;
    }
    const normalized = normalizeUrl(url);
    if (existing.has(normalized)) errors[row.id] = 'This product is already in the collection';
    else if (seen.has(normalized)) errors[row.id] = 'Duplicate link';
    seen.add(normalized);
  }
  return errors;
}

export function filledLinks(rows: LinkRow[]): string[] {
  return rows.map((r) => r.url.trim()).filter(Boolean);
}

export function LinksInfoCard() {
  return (
    <div className="flex items-center gap-3.5 rounded-2xl bg-[#f3f5ff] p-3.5">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-[#4f5bd5] shadow-sm">
        <Link2 className="h-5 w-5" />
      </span>
      <div>
        <p className="text-sm font-bold text-ink">Add product links</p>
        <p className="mt-0.5 text-xs leading-relaxed text-muted">
          Paste links from any website (Flipkart, Amazon, Myntra, etc.)
        </p>
      </div>
    </div>
  );
}

interface LinkFieldsProps {
  rows: LinkRow[];
  errors: Record<string, string>;
  /** Show errors on every row, not only rows the creator has left */
  showAllErrors?: boolean;
  /** State setter from the parent — updates are functional so rapid
   *  paste → focus-next → blur sequences never overwrite each other */
  setRows: React.Dispatch<React.SetStateAction<LinkRow[]>>;
  maxRows: number;
  disabled?: boolean;
}

export function LinkFields({ rows, errors, showAllErrors, setRows, maxRows, disabled }: LinkFieldsProps) {
  const toast = useToast();
  const inputs = useRef<Map<string, HTMLInputElement>>(new Map());

  const setUrl = (id: string, url: string, touched?: boolean) =>
    setRows((list) => list.map((r) => (r.id === id ? { ...r, url, touched: touched ?? r.touched } : r)));

  const focusNextEmpty = (afterId: string) => {
    const index = rows.findIndex((r) => r.id === afterId);
    const next = rows.slice(index + 1).find((r) => !r.url.trim());
    if (next) inputs.current.get(next.id)?.focus();
  };

  // One tap on the icon pastes the copied link. The keyboard stays closed so
  // the creator can go copy the next link and tap the next box's icon.
  const pasteFromClipboard = async (id: string) => {
    const result = await readClipboard();
    if (!result.ok) {
      if (result.reason !== 'empty') inputs.current.get(id)?.focus();
      toast(CLIPBOARD_MESSAGES[result.reason], 'error');
      return;
    }
    const url = cleanLinkInput(result.text);
    if (!isValidUrl(url)) {
      toast('No link found in what you copied', 'error');
      return;
    }
    setUrl(id, url, true);
    navigator.vibrate?.(8);
  };

  return (
    <div>
      <div className="space-y-2.5">
        {rows.map((row, index) => {
          const error = (showAllErrors || row.touched) && errors[row.id];
          const filled = row.url.length > 0;
          return (
            <div key={row.id}>
              <div
                className={cn(
                  'flex h-[52px] items-center gap-2 rounded-2xl border bg-white pl-4 pr-1.5 transition-colors',
                  'focus-within:border-ink focus-within:ring-4 focus-within:ring-ink/5',
                  error ? 'border-red-400' : 'border-line'
                )}
              >
                <input
                  ref={(el) => {
                    if (el) inputs.current.set(row.id, el);
                    else inputs.current.delete(row.id);
                  }}
                  type="url"
                  inputMode="url"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  enterKeyHint="next"
                  disabled={disabled}
                  placeholder={`Product link ${index + 1}`}
                  value={row.url}
                  onChange={(e) => setUrl(row.id, e.target.value)}
                  onPaste={(e) => {
                    const text = e.clipboardData.getData('text');
                    if (!text) return;
                    e.preventDefault();
                    setUrl(row.id, cleanLinkInput(text), true);
                    focusNextEmpty(row.id);
                  }}
                  onBlur={() =>
                    setRows((list) =>
                      list.map((r) => (r.id === row.id ? { ...r, url: cleanLinkInput(r.url), touched: true } : r))
                    )
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      focusNextEmpty(row.id);
                    }
                  }}
                  className="h-full min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-subtle disabled:text-muted"
                />
                {filled ? (
                  <button
                    type="button"
                    onClick={() => setUrl(row.id, '', false)}
                    disabled={disabled}
                    aria-label={`Clear product link ${index + 1}`}
                    className="tap flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-subtle hover:bg-canvas hover:text-ink"
                  >
                    <X className="h-[18px] w-[18px]" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => pasteFromClipboard(row.id)}
                    disabled={disabled}
                    aria-label={`Paste into product link ${index + 1}`}
                    className="tap flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-muted hover:bg-canvas hover:text-ink"
                  >
                    <ClipboardPaste className="h-[18px] w-[18px]" />
                  </button>
                )}
              </div>
              {error && <p className="mt-1 pl-1 text-xs font-medium text-red-600">{error}</p>}
            </div>
          );
        })}
      </div>

      {rows.length < maxRows && (
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            const row = { id: generateInputId(), url: '' };
            setRows((list) => [...list, row]);
            requestAnimationFrame(() => inputs.current.get(row.id)?.focus());
          }}
          className="tap mt-3 flex h-11 items-center gap-2 rounded-xl px-1 text-sm font-bold text-brand hover:text-brand-600"
        >
          <PlusCircle className="h-5 w-5 fill-brand text-white" />
          Add Another Product
        </button>
      )}
    </div>
  );
}
