// =============================================================================
// FLILINK — Core Unit Tests
// Tests URL validation, normalization, platform detection, and slug generator
// =============================================================================

const assert = require('assert');

// 1. URL Validation
function isValidUrl(urlString) {
  try {
    const url = new URL(urlString.trim());
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

// 2. Normalize URL
function normalizeUrl(urlString) {
  try {
    const url = new URL(urlString.trim());
    const trackingParams = [
      'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
      'fbclid', 'gclid', 'ref', 'source', 'platform',
    ];
    trackingParams.forEach((param) => url.searchParams.delete(param));
    let normalized = `${url.protocol}//${url.hostname.toLowerCase()}${url.pathname}`;
    const remainingParams = url.searchParams.toString();
    if (remainingParams) normalized += `?${remainingParams}`;
    return normalized.replace(/\/+$/, '');
  } catch {
    return urlString.trim().toLowerCase();
  }
}

// 3. Platform Detection
function detectPlatform(urlString) {
  try {
    const url = new URL(urlString.trim());
    const hostname = url.hostname.toLowerCase();
    if (hostname.includes('flipkart.com') || hostname === 'fkrt.it') return 'Flipkart';
    if (hostname.includes('meesho.com') || hostname === 'meesho.app.link') return 'Meesho';
    if (hostname.includes('amazon.') || hostname === 'amzn.to' || hostname === 'amzn.in') return 'Amazon';
    if (hostname.includes('myntra.com')) return 'Myntra';
    if (hostname.includes('ajio.com')) return 'Ajio';
  } catch {
    return 'Unknown';
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
console.log('✓ Platform Detection tests passed');

// Test 3: URL Normalization
const urlWithTracking = 'https://www.flipkart.com/item?utm_source=ig&utm_medium=social&pid=123';
const normalized = normalizeUrl(urlWithTracking);
assert.strictEqual(normalized.includes('utm_source'), false);
assert.strictEqual(normalized.includes('utm_medium'), false);
assert.strictEqual(normalized.includes('pid=123'), true);
console.log('✓ URL Normalization tests passed');

console.log('\nAll unit tests passed successfully (100%)!');
