// =============================================================================
// FLILINK — Product details fetcher
// =============================================================================
// link → store profile → fetch as the identities that store accepts (retrying
// the next one when blocked or incomplete) → extract title, image, price, MRP.
// Never throws: always returns a result with a status, so a product is saved
// even when a store refuses every request.
// =============================================================================

import * as cheerio from 'cheerio';
import { detectPlatform } from '@/lib/utils';
import type { AdapterResult } from './types';
import { fetchPage, type FetchedPage } from './http';
import { IDENTITIES, storeProfile, type Identity } from './stores';
import {
  EMPTY_PRODUCT,
  absoluteUrl,
  formatRupees,
  fromMeta,
  isPlaceholderImage,
  mergeProduct,
  titleFromUrl,
  type ProductData,
} from './extract';

/** Whole lookup, all attempts included (the API route allows 30s) */
const TOTAL_BUDGET_MS = 22_000;
const ATTEMPT_TIMEOUT_MS = 10_000;

/** Captcha / bot-wall / error pages that must not be read as a product */
function isBlocked(page: FetchedPage): boolean {
  if (page.status >= 400) return true;
  const html = page.html;
  if (/validateCaptcha|Enter the characters you see below|api-services-support@amazon\.com/i.test(html)) {
    return true; // Amazon robot check
  }
  if (html.length > 5000) return false;
  // Tiny bodies are "Access Denied" / challenge / JS-redirect interstitials —
  // unless they carry link-preview tags (e.g. Amazon's short-link page)
  if (/access denied|captcha|just a moment|attention required|cf-chl/i.test(html)) return true;
  return !/og:title|og:image|<title[^>]*>\s*[^<\s]/i.test(html);
}

const isComplete = (d: ProductData) => !!(d.title && d.image && d.price);

export async function fetchMetadataForUrl(url: string): Promise<AdapterResult> {
  const startedAt = Date.now();
  const timeLeft = () => TOTAL_BUDGET_MS - (Date.now() - startedAt);

  let platform = detectPlatform(url);
  let profile = storeProfile(platform);
  let finalUrl = url;
  let data: ProductData = { ...EMPTY_PRODUCT };
  const tried = new Set<Identity>();

  const attempt = async (identity: Identity) => {
    tried.add(identity);
    const page = await fetchPage(url, IDENTITIES[identity], {
      timeoutMs: Math.min(ATTEMPT_TIMEOUT_MS, timeLeft()),
      maxBytes: profile.maxHtmlBytes,
    });
    if (isBlocked(page)) return null;
    // Short links (bit.ly, amzn.to, dl.flipkart.com…) reveal the store on redirect
    finalUrl = page.url;
    const landed = detectPlatform(page.url);
    if (landed !== 'Unknown' && landed !== platform) {
      platform = landed;
      profile = storeProfile(platform);
    }
    return page;
  };

  for (const identity of profile.identities) {
    if (isComplete(data) || timeLeft() < 1500) break;
    if (tried.has(identity)) continue;
    try {
      const page = await attempt(identity);
      if (!page) continue;
      data = mergeProduct(data, profile.extract(cheerio.load(page.html), page.html));
    } catch (err) {
      console.warn(`[metadata] ${identity} failed for ${url}:`, err instanceof Error ? err.message : err);
    }
  }

  // Some pages render the title client-side; the link-preview version of the
  // page always carries it in Open Graph tags
  if ((!data.title || !data.image) && !tried.has('linkPreview') && !profile.noLinkPreview && timeLeft() > 1500) {
    try {
      const page = await attempt('linkPreview');
      if (page) data = mergeProduct(data, fromMeta(cheerio.load(page.html)));
    } catch {
      // keep what we have
    }
  }

  data.title ??= titleFromUrl(finalUrl) ?? titleFromUrl(url);

  let image = data.image && profile.normalizeImage ? profile.normalizeImage(data.image) : data.image;
  image = absoluteUrl(image, finalUrl);
  if (image && isPlaceholderImage(image)) image = null; // a store logo is worse than no image

  // An MRP at or below the price isn't a discount
  const mrp = data.mrp && data.price && data.mrp > data.price ? data.mrp : null;

  const found = [data.title, image, data.price].filter(Boolean).length;
  const status: AdapterResult['status'] = found === 3 ? 'completed' : found > 0 ? 'partial' : 'failed';

  console.info(
    `[metadata] ${platform} ${status} in ${Date.now() - startedAt}ms via ${[...tried].join('>')} — ${url}`
  );

  return {
    title: data.title,
    imageUrl: image,
    price: formatRupees(data.price),
    originalPrice: formatRupees(mrp),
    platformName: platform,
    status,
  };
}
