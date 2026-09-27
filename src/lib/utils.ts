// =============================================================================
// FLILINK — Utility Functions
// =============================================================================

import { nanoid, customAlphabet } from 'nanoid';
import { SLUG_ALPHABET, SLUG_LENGTH, PLATFORM_PATTERNS } from './constants';
import type { PlatformName } from '@/types';

// --- Slug generation ---
const generateSlug = customAlphabet(SLUG_ALPHABET, SLUG_LENGTH);

/**
 * Generate a short, random, stable collection slug.
 * Example output: "x7kQ3m2P"
 */
export function createCollectionSlug(): string {
  return generateSlug();
}

// --- URL helpers ---

/**
 * Validate that a string is a syntactically valid HTTP/HTTPS URL.
 * Does NOT check if the page is accessible or if the domain is known.
 */
export function isValidUrl(input: string): boolean {
  try {
    const url = new URL(input.trim());
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Normalize a URL for duplicate detection within a collection.
 * Preserves affiliate/tracking parameters (the full query string).
 * Strips trailing slashes, lowercases the hostname, removes fragments.
 */
export function normalizeUrl(rawUrl: string): string {
  try {
    const url = new URL(rawUrl.trim());
    // Lowercase protocol and hostname
    let normalized = `${url.protocol}//${url.hostname.toLowerCase()}`;
    // Preserve path, remove trailing slash (except root)
    let pathname = url.pathname;
    if (pathname.length > 1 && pathname.endsWith('/')) {
      pathname = pathname.slice(0, -1);
    }
    normalized += pathname;
    // Preserve query string (includes affiliate params)
    if (url.search) {
      normalized += url.search;
    }
    // Strip fragment/hash
    return normalized;
  } catch {
    return rawUrl.trim();
  }
}

/**
 * Detect the platform from a URL hostname.
 * Used for adapter selection — never as a rejection filter.
 */
export function detectPlatform(url: string): PlatformName {
  let host: string;
  try {
    host = new URL(url.trim()).hostname.toLowerCase();
  } catch {
    return 'Unknown';
  }
  for (const [platform, pattern] of Object.entries(PLATFORM_PATTERNS)) {
    if (pattern.test(host)) return platform as PlatformName;
  }
  return 'Unknown';
}

/**
 * Generate the public collection URL.
 */
export function getPublicCollectionUrl(slug: string): string {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/c/${slug}`;
  }
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return `${baseUrl}/c/${slug}`;
}

/**
 * Truncate a string to a max length with ellipsis.
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 1).trimEnd() + '…';
}

/**
 * Merge CSS class names, filtering out falsy values.
 */
export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

/**
 * Generate a unique ID for URL input list items (client-side).
 */
export function generateInputId(): string {
  return nanoid(10);
}

/**
 * Human friendly relative time, e.g. "2 days ago".
 */
export function timeAgo(iso: string): string {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return 'just now';
  const units: [number, string][] = [
    [60 * 60 * 24 * 365, 'year'],
    [60 * 60 * 24 * 30, 'month'],
    [60 * 60 * 24 * 7, 'week'],
    [60 * 60 * 24, 'day'],
    [60 * 60, 'hour'],
    [60, 'minute'],
  ];
  for (const [size, label] of units) {
    const value = Math.floor(seconds / size);
    if (value >= 1) return `${value} ${label}${value > 1 ? 's' : ''} ago`;
  }
  return 'just now';
}

/**
 * Discount percentage from price strings like "₹1,999" and "₹749".
 */
export function discountPercent(price: string | null, originalPrice: string | null): number | null {
  if (!price || !originalPrice) return null;
  const curr = parseFloat(price.replace(/[^\d.]/g, ''));
  const orig = parseFloat(originalPrice.replace(/[^\d.]/g, ''));
  if (isNaN(curr) || isNaN(orig) || orig <= 0 || orig <= curr) return null;
  const pct = Math.round(((orig - curr) / orig) * 100);
  return pct > 0 ? pct : null;
}

/**
 * Normalise a user typed price into the stored display format ("₹749").
 * Returns null for empty input.
 */
export function formatPriceInput(input: string): string | null {
  const digits = input.replace(/[^\d.]/g, '');
  if (!digits) return null;
  const value = Number(digits);
  if (isNaN(value)) return null;
  return `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

/**
 * Copy text to the clipboard, falling back to a hidden textarea for
 * older mobile browsers / non-secure contexts.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const el = document.createElement('textarea');
      el.value = text;
      el.setAttribute('readonly', '');
      el.style.position = 'fixed';
      el.style.opacity = '0';
      document.body.appendChild(el);
      el.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(el);
      return ok;
    } catch {
      return false;
    }
  }
}

/**
 * Turn whatever the creator pasted into a link. Marketplace "share" buttons
 * copy text like "Check out this product! https://dl.flipkart.com/s/abc",
 * so pull the first URL out; bare domains get https:// added.
 */
export function cleanLinkInput(input: string): string {
  const text = input.trim();
  const found = text.match(/https?:\/\/[^\s<>"']+/i);
  if (found) return found[0].replace(/[),.]+$/, '');
  if (/^[\w-]+(\.[\w-]+)+(\/\S*)?$/i.test(text)) return `https://${text}`;
  return text;
}

/** Run `worker` over `items` with at most `limit` in flight. Never rejects. */
export async function runPool<T>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<void>
): Promise<void> {
  let next = 0;
  const lanes = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      await worker(items[index], index).catch(() => {});
    }
  });
  await Promise.all(lanes);
}

/** Store name to show for a product: detected platform, else the link's domain. */
export function productSource(platformName: string | null, url: string): string {
  if (platformName && platformName !== 'Unknown') return platformName;
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'Store';
  }
}

/** "₹1,999" → "1999" for editing in a numeric field. */
export function priceDigits(price: string | null): string {
  return price ? price.replace(/[^\d.]/g, '') : '';
}
