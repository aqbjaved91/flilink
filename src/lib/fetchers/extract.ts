// =============================================================================
// FLILINK — Shared extraction helpers
// =============================================================================
// Structured data (JSON-LD), Open Graph / Twitter / microdata meta tags,
// price parsing and title clean-up used by every store extractor.
// =============================================================================

import type { CheerioAPI } from 'cheerio';

export interface ProductData {
  title: string | null;
  image: string | null;
  /** Selling price in rupees */
  price: number | null;
  /** MRP / list price in rupees */
  mrp: number | null;
}

export const EMPTY_PRODUCT: ProductData = { title: null, image: null, price: null, mrp: null };

/** Fill the gaps in `base` from each of `sources`, in order. */
export function mergeProduct(base: ProductData, ...sources: Partial<ProductData>[]): ProductData {
  const out = { ...base };
  for (const source of sources) {
    out.title ??= source.title ?? null;
    out.image ??= source.image ?? null;
    out.price ??= source.price ?? null;
    out.mrp ??= source.mrp ?? null;
  }
  return out;
}

// -----------------------------------------------------------------------------
// Text
// -----------------------------------------------------------------------------

const ENTITIES: Record<string, string> = { amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', nbsp: ' ' };

export function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, code: string) => {
    if (code[0] === '#') {
      const n = code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : match;
    }
    return ENTITIES[code.toLowerCase()] ?? match;
  });
}

/** Titles that mean we got a block / error / template page, not a product */
const NOT_A_PRODUCT =
  /^(amazon(\.in)?|flipkart(\.com)?|myntra|meesho|shopsy(\.in)?|ajio|access denied|page not found|404\b.*|robot check|sorry!?\s.*|just a moment.*|attention required.*|online shopping.*|error.*)$/i;

export function cleanTitle(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let title = decodeEntities(raw).replace(/\s+/g, ' ').trim();
  // Unrendered page templates such as "{TITLE} - Buy {TITLE} Online"
  if (!title || /\{[A-Z_@]+\}/.test(title)) return null;

  title = title
    .replace(/^Amazon\.in\s*:\s*/i, '')
    .replace(/^Buy\s+/i, '')
    .replace(/\s*:\s*Amazon\.in\s*:.*$/i, '')
    .replace(/\s+at\s+Amazon\.in.*$/i, '')
    .replace(/\s+-\s+Buy\s+.+$/i, '') // Flipkart / Shopsy: "X - Buy X Online at…"
    .replace(/\s+Online\s+(at|on|from|in)\b.*$/i, '') // "… Online at Bewakoof", "… Online in India"
    .replace(/\s+-\s+(Apparel|Footwear|Accessories|Jewellery|Beauty|Home)\s+for\s+.*$/i, '') // Myntra
    .replace(/\s*[|–—-]\s*(Flipkart(\.com)?|Myntra|Meesho|shopsy(\.in)?|AJIO|Nykaa[\w ]*|Amazon\.in)\s*$/i, '')
    .trim();

  if (!title || NOT_A_PRODUCT.test(title)) return null;
  return title.length > 200 ? `${title.slice(0, 197).trimEnd()}…` : title;
}

/** Last resort: readable title from the link itself, e.g. /madhubani-print-saree/p/1nnri7 */
export function titleFromUrl(url: string): string | null {
  try {
    const segments = new URL(url).pathname.split('/').map((s) => decodeURIComponent(s));
    const slug = segments
      .filter((s) => /[a-z]/i.test(s) && s.includes('-') && s.length > 8)
      .sort((a, b) => b.length - a.length)[0];
    if (!slug) return null;
    const words = slug.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim().split(' ');
    return cleanTitle(words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '));
  } catch {
    return null;
  }
}

// -----------------------------------------------------------------------------
// Prices
// -----------------------------------------------------------------------------

export function parsePrice(value: unknown): number | null {
  let n: number;
  if (typeof value === 'number') n = value;
  else if (typeof value === 'string') {
    const match = value.replace(/,/g, '').match(/\d+(?:\.\d+)?/);
    if (!match) return null;
    n = parseFloat(match[0]);
  } else return null;
  if (!Number.isFinite(n) || n <= 0 || n > 10_000_000) return null;
  return Math.round(n * 100) / 100;
}

/** 1999 → "₹1,999" (paise kept only when present, e.g. "₹249.50") */
export function formatRupees(amount: number | null): string | null {
  if (amount == null) return null;
  return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

/** First capture group of `pattern` in `text`, as a price */
export function priceFromPattern(text: string, pattern: RegExp): number | null {
  const match = text.match(pattern);
  return match ? parsePrice(match[1]) : null;
}

// -----------------------------------------------------------------------------
// Meta tags
// -----------------------------------------------------------------------------

export function meta($: CheerioAPI, ...names: string[]): string | null {
  for (const name of names) {
    const value =
      $(`meta[property="${name}"]`).attr('content') ??
      $(`meta[name="${name}"]`).attr('content') ??
      $(`meta[itemprop="${name}"]`).attr('content');
    if (value && value.trim()) return value.trim();
  }
  return null;
}

export function fromMeta($: CheerioAPI): Partial<ProductData> {
  return {
    title:
      cleanTitle(meta($, 'og:title')) ??
      cleanTitle(meta($, 'twitter:title')) ??
      cleanTitle($('title').first().text()),
    image: meta($, 'og:image:secure_url', 'og:image', 'twitter:image', 'twitter:image:src', 'image'),
    price: parsePrice(
      meta($, 'product:price:amount', 'og:price:amount', 'price') ?? $('[itemprop="price"]').first().attr('content')
    ),
  };
}

// -----------------------------------------------------------------------------
// JSON-LD
// -----------------------------------------------------------------------------

type JsonObject = Record<string, unknown>;

export function isJsonObject(value: unknown): value is JsonObject {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
const isObject = isJsonObject;

export function jsonLdProducts($: CheerioAPI): JsonObject[] {
  const products: JsonObject[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    let data: unknown;
    try {
      data = JSON.parse($(el).text().trim());
    } catch {
      return;
    }
    const queue: unknown[] = Array.isArray(data) ? [...data] : [data];
    while (queue.length > 0) {
      const item = queue.shift();
      if (!isObject(item)) continue;
      if (Array.isArray(item['@graph'])) queue.push(...item['@graph']);
      const type = ([] as unknown[]).concat(item['@type'] ?? []).join(' ');
      if (/\bProduct\b/i.test(type)) products.push(item);
      else if (/\bProductGroup\b/i.test(type) && Array.isArray(item.hasVariant)) queue.push(...item.hasVariant);
    }
  });
  return products;
}

export function firstImage(value: unknown): string | null {
  if (typeof value === 'string') return value.trim() || null;
  if (Array.isArray(value)) {
    for (const v of value) {
      const found = firstImage(v);
      if (found) return found;
    }
    return null;
  }
  if (isObject(value)) return firstImage(value.url ?? value.contentUrl);
  return null;
}

export function fromJsonLd($: CheerioAPI): Partial<ProductData> {
  const product = jsonLdProducts($)[0];
  if (!product) return {};

  let price: number | null = null;
  const offers = ([] as unknown[]).concat(product.offers ?? []);
  for (const offer of offers) {
    if (!isObject(offer)) continue;
    const spec = isObject(offer.priceSpecification) ? offer.priceSpecification : {};
    price = parsePrice(offer.price ?? offer.lowPrice ?? spec.price);
    if (price) break;
  }

  return {
    title: typeof product.name === 'string' ? cleanTitle(product.name) : null,
    image: firstImage(product.image),
    price,
  };
}

// -----------------------------------------------------------------------------
// Embedded JSON (window.__STATE__ = {...}, __NEXT_DATA__, …)
// -----------------------------------------------------------------------------

/** Parse the JSON object assigned right after `marker` in an inline script. */
export function embeddedJson(html: string, marker: string): unknown {
  const at = html.indexOf(marker);
  if (at < 0) return null;
  const start = html.indexOf('{', at);
  const end = html.indexOf('</script>', start);
  if (start < 0 || end < 0) return null;
  try {
    return JSON.parse(html.slice(start, end).trim().replace(/;\s*$/, ''));
  } catch {
    return null;
  }
}

/** Depth-first search (document order) for the first object matching `test`. */
export function findObject(root: unknown, test: (obj: JsonObject) => boolean, maxNodes = 200_000): JsonObject | null {
  const stack: unknown[] = [root];
  let visited = 0;
  while (stack.length > 0 && visited++ < maxNodes) {
    const node = stack.pop();
    if (Array.isArray(node)) {
      for (let i = node.length - 1; i >= 0; i--) stack.push(node[i]);
    } else if (isObject(node)) {
      if (test(node)) return node;
      const values = Object.values(node);
      for (let i = values.length - 1; i >= 0; i--) stack.push(values[i]);
    }
  }
  return null;
}

const PRICE_KEYS = [
  'price', 'selling_price', 'sellingPrice', 'final_price', 'finalPrice', 'offer_price', 'offerPrice',
  'sale_price', 'salePrice', 'special_price', 'specialPrice', 'discounted_price', 'discountedPrice',
];
const MRP_KEYS = [
  'mrp', 'MRP', 'actual_price', 'actualPrice', 'original_price', 'originalPrice', 'list_price', 'listPrice',
  'regular_price', 'regularPrice', 'compare_at_price', 'compareAtPrice', 'strike_price', 'strikePrice',
];

const STATE_MARKERS = ['__NEXT_DATA__', 'window.__INITIAL_STATE__', 'window.__PRELOADED_STATE__', 'window.__data'];

/**
 * Price + MRP from a site's embedded page data (Next.js, Redux…). Only an
 * object holding BOTH a selling price and an MRP is trusted — the first such
 * object in the page is the product being viewed, not a recommendation.
 */
export function embeddedPricing(html: string): Partial<ProductData> {
  const firstNumber = (obj: JsonObject, keys: string[]) => {
    for (const key of keys) {
      const value = parsePrice(obj[key]);
      if (value) return value;
    }
    return null;
  };
  for (const marker of STATE_MARKERS) {
    const state = embeddedJson(html, marker);
    if (!state) continue;
    const pricing = findObject(state, (o) => {
      const price = firstNumber(o, PRICE_KEYS);
      const mrp = firstNumber(o, MRP_KEYS);
      return !!price && !!mrp && mrp >= price;
    });
    if (pricing) return { price: firstNumber(pricing, PRICE_KEYS), mrp: firstNumber(pricing, MRP_KEYS) };
  }
  return {};
}

/** Site logos / share cards that stores put in og:image when a page has no product image */
export function isPlaceholderImage(url: string): boolean {
  try {
    const path = new URL(url).pathname.toLowerCase();
    return /logo|favicon|sprite|placeholder|no[-_]?image|default[-_]?(og|share|image|img)|og[-_]?(default|image)\.|social[-_]?(share|card)/.test(
      path
    );
  } catch {
    return true;
  }
}

/** Every `text` string inside `root`, in document order. */
export function collectTexts(root: unknown): string[] {
  const texts: string[] = [];
  const walk = (node: unknown) => {
    if (Array.isArray(node)) node.forEach(walk);
    else if (isObject(node)) {
      for (const [key, value] of Object.entries(node)) {
        if (key === 'text' && typeof value === 'string') texts.push(value.trim());
        else walk(value);
      }
    }
  };
  walk(root);
  return texts;
}

// -----------------------------------------------------------------------------
// URLs
// -----------------------------------------------------------------------------

export function absoluteUrl(value: string | null, base: string): string | null {
  if (!value) return null;
  try {
    const url = new URL(decodeEntities(value.trim()), base);
    if (url.protocol === 'http:') url.protocol = 'https:'; // avoid mixed content
    return url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
}
