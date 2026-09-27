// =============================================================================
// FLILINK — Store profiles
// =============================================================================
// For each store: which browser identities get real product pages (tested
// against the live sites), how to read title / image / price / MRP, and how
// to turn the image into a sharp, phone-friendly URL. Unknown sites use the
// generic profile (JSON-LD, Open Graph, microdata).
// =============================================================================

import type { CheerioAPI } from 'cheerio';
import type { PlatformName } from '@/types';
import {
  collectTexts,
  embeddedJson,
  embeddedPricing,
  findObject,
  isJsonObject,
  fromJsonLd,
  fromMeta,
  mergeProduct,
  EMPTY_PRODUCT,
  meta,
  parsePrice,
  priceFromPattern,
  cleanTitle,
  type ProductData,
} from './extract';

// -----------------------------------------------------------------------------
// Browser identities
// -----------------------------------------------------------------------------
// Bot protection on these stores checks that a request "looks like" the
// browser it claims to be. Safari identities pass where Chrome ones get
// captchas / 403s; link-preview crawlers get Open Graph tags from most stores.

export type Identity = 'safariMac' | 'safariIphone' | 'safariIphoneAlt' | 'chrome' | 'linkPreview';

const SAFARI_ACCEPT = 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8';

export const IDENTITIES: Record<Identity, Record<string, string>> = {
  safariMac: {
    'User-Agent':
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15',
    Accept: SAFARI_ACCEPT,
    'Accept-Language': 'en-IN,en-GB;q=0.9,en;q=0.8',
  },
  safariIphone: {
    'User-Agent':
      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
    Accept: SAFARI_ACCEPT,
    'Accept-Language': 'en-IN,en-GB;q=0.9,en;q=0.8',
  },
  safariIphoneAlt: {
    'User-Agent':
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Mobile/15E148 Safari/604.1',
    Accept: SAFARI_ACCEPT,
    'Accept-Language': 'en-IN,en;q=0.9',
  },
  chrome: {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-IN,en;q=0.9',
  },
  linkPreview: {
    'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
    Accept: 'text/html,*/*;q=0.8',
  },
};

// -----------------------------------------------------------------------------
// Store profiles
// -----------------------------------------------------------------------------

export interface StoreProfile {
  name: PlatformName;
  /** Identities to try, in order, until the product is complete */
  identities: Identity[];
  extract: ($: CheerioAPI, html: string) => Partial<ProductData>;
  normalizeImage?: (url: string) => string;
  /** Product data sits near the top of very large pages — stop reading here */
  maxHtmlBytes?: number;
  /** The store stalls or blocks link-preview crawlers — don't waste a request */
  noLinkPreview?: boolean;
}

const generic = ($: CheerioAPI, html = '') =>
  mergeProduct(EMPTY_PRODUCT, fromJsonLd($), fromMeta($), html ? embeddedPricing(html) : {});

// --- Amazon -------------------------------------------------------------------

function extractAmazon($: CheerioAPI): Partial<ProductData> {
  const firstText = (...selectors: string[]) => {
    for (const selector of selectors) {
      const text = $(selector).first().text().trim();
      if (text) return text;
    }
    return null;
  };

  let image = $('#landingImage').attr('data-old-hires') || null;
  if (!image) {
    // data-a-dynamic-image = {"url": [w, h], …} — take the largest
    const dynamic = $('#landingImage, #imgBlkFront').first().attr('data-a-dynamic-image');
    if (dynamic) {
      try {
        const sizes = Object.entries(JSON.parse(dynamic) as Record<string, [number, number]>);
        sizes.sort((a, b) => b[1][0] * b[1][1] - a[1][0] * a[1][1]);
        image = sizes[0]?.[0] ?? null;
      } catch {
        // ignore malformed attribute
      }
    }
  }
  image ??= $('#landingImage').attr('src') || $('#imgBlkFront').attr('src') || null;

  return mergeProduct(
    EMPTY_PRODUCT,
    {
      title: cleanTitle(firstText('#productTitle', '#title')),
      image,
      price: parsePrice(
        firstText(
          '#apex-pricetopay-accessibility-label',
          '#corePriceDisplay_desktop_feature_div .priceToPay .a-offscreen',
          '.priceToPay .a-offscreen',
          '#corePrice_feature_div .a-offscreen',
          '.apexPriceToPay .a-offscreen',
          '#priceblock_dealprice',
          '#priceblock_ourprice',
          'span.a-price:not(.a-text-price) .a-offscreen'
        )
      ),
      mrp: parsePrice(
        firstText(
          '.apex-basisprice-offscreen-label',
          '#corePriceDisplay_desktop_feature_div .basisPrice .a-offscreen',
          '.basisPrice .a-offscreen',
          'span.a-price.a-text-price[data-a-strike] .a-offscreen',
          '#listPrice'
        )
      ),
    },
    generic($)
  );
}

/** Replace Amazon's size / crop modifier ("._SY445_", "._SR600,315_…"), or add one: 800px */
function amazonImage(url: string): string {
  return url.replace(/(\/images\/I\/[^/.]+)(\._[^/]+?)?\.(jpe?g|png|webp)$/i, '$1._SL800_.$3');
}

// --- Flipkart & Shopsy (same platform and image CDN) ---------------------------

/** Flipkart images carry size placeholders ({@width}) or small sizes — ask for 832px */
function flipkartImage(url: string): string {
  return url
    .replace(/\{@width\}/g, '832')
    .replace(/\{@height\}/g, '832')
    .replace(/\{@quality\}/g, '70')
    .replace(/\/image\/\d+\/\d+\//, '/image/832/832/');
}

/**
 * Flipkart's product page keeps the price in the "price details" widget of
 * window.__INITIAL_STATE__: "₹999 · MRP (Incl. of all taxes) · Total Amount · ₹424".
 */
function flipkartPriceBreakup(state: unknown): Partial<ProductData> {
  const widget = findObject(state, (o) => o.widgetName === 'ATLAS_PRICE_DETAIL_BREAKUP');
  if (!widget) return {};

  const texts = collectTexts(widget.data);
  const isAmount = (t: string | undefined) => !!t && /^₹\s?[\d,]+(\.\d+)?$/.test(t);
  const amountNear = (label: RegExp) => {
    const i = texts.findIndex((t) => label.test(t));
    if (i < 0) return null;
    if (isAmount(texts[i + 1])) return parsePrice(texts[i + 1]);
    if (isAmount(texts[i - 1])) return parsePrice(texts[i - 1]);
    return null;
  };

  const amounts = texts.filter(isAmount).map((t) => parsePrice(t)!).filter(Boolean);
  const price = amountNear(/^total amount$/i) ?? (amounts.length ? Math.min(...amounts) : null);
  const mrp = amountNear(/^MRP\b/i) ?? (amounts.length ? Math.max(...amounts) : null);
  return { price, mrp };
}

function extractFlipkart($: CheerioAPI, html: string): Partial<ProductData> {
  const state = embeddedJson(html, 'window.__INITIAL_STATE__');
  const data = mergeProduct(
    EMPTY_PRODUCT,
    fromJsonLd($),
    flipkartPriceBreakup(state),
    listingPrice(state), // older product page layout
    fromMeta($)
  );
  // "… For Only Rs. 1999.0 Online in India" in the description is the MRP
  data.mrp ??= priceFromPattern(meta($, 'description') ?? '', /Rs\.\s*([\d,]+(?:\.\d+)?)/i);
  return data;
}

/**
 * The price shoppers actually see ("₹184 per item", MRP struck through) is the
 * first "ListingPriceValue" block — the product summary widget. Tracking
 * objects elsewhere on the page carry other numbers (new-user special price,
 * multi-item totals), so they are only a last resort.
 */
function listingPrice(state: unknown): Partial<ProductData> {
  const listing = findObject(state, (o) => o.type === 'ListingPriceValue' && isJsonObject(o.finalPrice));
  if (!listing) return {};
  const prices = Array.isArray(listing.prices) ? listing.prices : [];
  const mrpEntry = prices.find((p) => isJsonObject(p) && p.priceType === 'MRP');
  return {
    price: parsePrice((listing.finalPrice as { value?: unknown }).value),
    mrp: isJsonObject(mrpEntry) ? parsePrice(mrpEntry.value) : null,
  };
}

function extractShopsy($: CheerioAPI, html: string): Partial<ProductData> {
  const nextData = embeddedJson(html, '__NEXT_DATA__');
  const tracking = findObject(nextData, (o) => typeof o.finalPrice === 'number' && typeof o.mrp === 'number');
  return mergeProduct(
    EMPTY_PRODUCT,
    listingPrice(nextData),
    fromJsonLd($),
    { price: parsePrice(tracking?.finalPrice), mrp: parsePrice(tracking?.mrp) },
    fromMeta($)
  );
}

// --- Myntra ------------------------------------------------------------------

function extractMyntra($: CheerioAPI, html: string): Partial<ProductData> {
  // window.__myx … "price":{"mrp":2299,"discounted":1149}
  const priceBlock = html.match(/"price":\{"mrp":([\d.]+),"discounted":([\d.]+)/);
  return mergeProduct(
    EMPTY_PRODUCT,
    fromJsonLd($),
    { price: parsePrice(priceBlock?.[2]), mrp: parsePrice(priceBlock?.[1]) },
    fromMeta($)
  );
}

function myntraImage(url: string): string {
  return url.replace(/h_\d+,q_\d+,w_\d+/, 'h_1080,q_90,w_810');
}

// --- Meesho ------------------------------------------------------------------

function extractMeesho($: CheerioAPI, html: string): Partial<ProductData> {
  return mergeProduct(
    EMPTY_PRODUCT,
    fromJsonLd($),
    {
      price: priceFromPattern(html, /"final_price":\{[^}]*?"value":([\d.]+)/),
      // Meesho's page shows only the selling price; the supplier "MRP" sits in
      // an info popup, so a struck-out price is used only when Meesho shows one
      mrp: priceFromPattern(html, /"original_price":([\d.]+)/),
    },
    fromMeta($)
  );
}

/** Meesho serves AVIF by default; WebP works on every phone */
function meeshoImage(url: string): string {
  return url.replace(/\.avif(\?|$)/i, '.webp$1');
}

// -----------------------------------------------------------------------------

const PROFILES: Record<Exclude<PlatformName, 'Unknown'> | 'Generic', StoreProfile> = {
  Amazon: {
    name: 'Amazon',
    identities: ['safariMac', 'linkPreview', 'chrome'],
    extract: extractAmazon,
    normalizeImage: amazonImage,
    // Title, price and images all sit in the first ~300KB of a ~2MB page
    maxHtmlBytes: 900_000,
  },
  Flipkart: {
    name: 'Flipkart',
    identities: ['safariMac', 'linkPreview', 'safariIphone'],
    extract: extractFlipkart,
    normalizeImage: flipkartImage,
  },
  Shopsy: {
    name: 'Shopsy',
    identities: ['safariMac', 'safariIphone'],
    extract: extractShopsy,
    normalizeImage: flipkartImage,
  },
  Myntra: {
    name: 'Myntra',
    identities: ['safariMac', 'safariIphone'],
    extract: extractMyntra,
    normalizeImage: myntraImage,
    noLinkPreview: true,
  },
  Meesho: {
    // Meesho's bot wall only lets iPhone Safari through, and extra blocked
    // requests make it stricter — so no other identities
    name: 'Meesho',
    identities: ['safariIphone', 'safariIphoneAlt'],
    extract: extractMeesho,
    normalizeImage: meeshoImage,
    noLinkPreview: true,
  },
  Ajio: {
    name: 'Ajio',
    identities: ['safariMac', 'safariIphone', 'chrome', 'linkPreview'],
    extract: generic,
  },
  Generic: {
    name: 'Unknown',
    identities: ['safariMac', 'safariIphone', 'chrome', 'linkPreview'],
    extract: generic,
  },
};

export function storeProfile(platform: PlatformName): StoreProfile {
  return platform === 'Unknown' ? PROFILES.Generic : PROFILES[platform];
}
