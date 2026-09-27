// =============================================================================
// FLILINK — One-tap paste
// =============================================================================
// Browsers only let a site read the clipboard on HTTPS (or localhost), from a
// tap, and — on Android — after a one-time "Allow" prompt. iOS shows its own
// small "Paste" bubble that must be tapped. Each failure gets a clear message.
// =============================================================================

export type ClipboardFailure = 'insecure' | 'unsupported' | 'denied' | 'empty';

export type ClipboardRead = { ok: true; text: string } | { ok: false; reason: ClipboardFailure };

export const CLIPBOARD_MESSAGES: Record<ClipboardFailure, string> = {
  insecure: 'One-tap paste needs the secure (https) app — long-press the box and tap Paste for now',
  unsupported: 'This browser can’t paste with one tap — long-press the box and tap Paste',
  denied: 'Allow clipboard access when your browser asks, or long-press the box to paste',
  empty: 'Copy a product link first, then tap paste',
};

/** Must be called straight from a tap handler (before any other await). */
export async function readClipboard(): Promise<ClipboardRead> {
  if (typeof window === 'undefined') return { ok: false, reason: 'unsupported' };
  if (!window.isSecureContext) return { ok: false, reason: 'insecure' };
  if (!navigator.clipboard?.readText) return { ok: false, reason: 'unsupported' };
  try {
    const text = (await navigator.clipboard.readText()).trim();
    return text ? { ok: true, text } : { ok: false, reason: 'empty' };
  } catch {
    return { ok: false, reason: 'denied' };
  }
}
