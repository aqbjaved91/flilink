// =============================================================================
// FLILINK — Core Unit Tests
// Tests URL validation, normalization, and platform detection.
//
// Plain Node, no build step or imports from src/ (which is TypeScript) — the
// functions below are copies of src/lib/utils.ts (and its PLATFORM_PATTERNS
// from src/lib/constants.ts), kept behaviourally identical on purpose. If you
// change the real implementation, update the copy here too.
// =============================================================================

const assert = require('assert');

// 1. URL Validation — src/lib/utils.ts: isValidUrl
function isValidUrl(urlString) {
  try {
    const url = new URL(urlString.trim());
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

// 2. Normalize URL — src/lib/utils.ts: normalizeUrl
// Preserves affiliate/tracking query params (stripping them would break
// commission attribution), lowercases protocol + hostname, strips one
// trailing slash from the path, and drops the hash fragment.
function normalizeUrl(rawUrl) {
  try {
    const url = new URL(rawUrl.trim());
    let normalized = `${url.protocol}//${url.hostname.toLowerCase()}`;
    let pathname = url.pathname;
    if (pathname.length > 1 && pathname.endsWith('/')) {
      pathname = pathname.slice(0, -1);
    }
    normalized += pathname;
    if (url.search) {
      normalized += url.search;
    }
    return normalized;
  } catch {
    return rawUrl.trim();
  }
}

// 3. Platform Detection — src/lib/utils.ts: detectPlatform
// Matched against the hostname only, anchored to the end ("(^|\.)...$") so a
// lookalike domain such as "notflipkart.com" can't be mistaken for the real
// store — copied from src/lib/constants.ts: PLATFORM_PATTERNS.
const PLATFORM_PATTERNS = {
  Amazon: /(^|\.)(amazon\.(in|com|co\.uk|ae|ca)|amzn\.(to|in|eu)|a\.co|link\.amazon|amzlinks?\.in)$/i,
  Flipkart: /(^|\.)(flipkart\.com|fkrt\.(co|it|cc))$/i,
  Shopsy: /(^|\.)shopsy\.in$/i,
  Meesho: /(^|\.)(meesho\.(com|in)|msho\.in|meesho\.onelink\.me)$/i,
  Myntra: /(^|\.)(myntra\.com|myntr\.it)$/i,
  Ajio: /(^|\.)(ajio\.com|ajiio\.in)$/i,
};

function detectPlatform(urlString) {
  let host;
  try {
    host = new URL(urlString.trim()).hostname.toLowerCase();
  } catch {
    return 'Unknown';
  }
  for (const [platform, pattern] of Object.entries(PLATFORM_PATTERNS)) {
    if (pattern.test(host)) return platform;
  }
  return 'Unknown';
}

console.log('Running Flilink Core Tests...\n');

// Test 1: URL Validation
assert.strictEqual(isValidUrl('https://dl.flipkart.com/s/12345'), true);
assert.strictEqual(isValidUrl('http://meesho.com/p/123'), true);
assert.strictEqual(isValidUrl('not-a-url'), false);
assert.strictEqual(isValidUrl('ftp://example.com'), false);
assert.strictEqual(isValidUrl(''), false);
console.log('✓ URL Validation tests passed');

// Test 2: Platform Detection
assert.strictEqual(detectPlatform('https://dl.flipkart.com/s/jHso8tuuuN'), 'Flipkart');
assert.strictEqual(detectPlatform('https://www.flipkart.com/product/p/itm123'), 'Flipkart');
assert.strictEqual(detectPlatform('https://www.meesho.com/s/p/12345'), 'Meesho');
assert.strictEqual(detectPlatform('https://amzn.in/d/abcde'), 'Amazon');
assert.strictEqual(detectPlatform('https://www.myntra.com/shirts/brand/123'), 'Myntra');
assert.strictEqual(detectPlatform('https://example.com/item'), 'Unknown');
// A lookalike hostname must not be mistaken for the real store — this is
// exactly what anchoring the pattern to the end of the hostname prevents
assert.strictEqual(detectPlatform('https://notflipkart.com/deal'), 'Unknown');
console.log('✓ Platform Detection tests passed');

// Test 3: URL Normalization
const urlWithTracking = 'https://www.flipkart.com/item?utm_source=ig&utm_medium=social&pid=123';
const normalized = normalizeUrl(urlWithTracking);
// Tracking / affiliate params are preserved, not stripped — Flilink must
// redirect through the creator's exact original link for attribution to work
assert.strictEqual(normalized.includes('utm_source=ig'), true);
assert.strictEqual(normalized.includes('utm_medium=social'), true);
assert.strictEqual(normalized.includes('pid=123'), true);
// Hostname is lowercased and a trailing slash is stripped from the path
assert.strictEqual(normalizeUrl('https://EXAMPLE.com/Path/'), 'https://example.com/Path');
console.log('✓ URL Normalization tests passed');

console.log('\nAll unit tests passed successfully (100%)!');
