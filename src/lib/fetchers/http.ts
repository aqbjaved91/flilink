// =============================================================================
// FLILINK — Page fetcher
// =============================================================================
// HTTP/2 first — some stores (e.g. Shopsy) never answer HTTP/1.1 clients —
// falling back to HTTP/1.1 for hosts without HTTP/2 (e.g. dl.flipkart.com).
// Follows redirects (short links), keeps cookies across hops, decompresses
// while streaming (so huge pages can be cut off once the useful top part has
// arrived) and enforces one deadline for the whole chain.
// =============================================================================

import http2 from 'node:http2';
import zlib from 'node:zlib';

const MAX_REDIRECTS = 8;
const MAX_BODY_BYTES = 8 * 1024 * 1024;
const REDIRECT_CODES = new Set([301, 302, 303, 307, 308]);

// Hosts that refused HTTP/2 — go straight to HTTP/1.1 next time
const http1OnlyHosts = new Set<string>();

export interface FetchedPage {
  /** Final URL after redirects */
  url: string;
  status: number;
  html: string;
}

interface FetchOptions {
  timeoutMs: number;
  /** Stop reading after this many (decompressed) bytes */
  maxBytes?: number;
}

interface RawResponse {
  status: number;
  location: string | null;
  setCookie: string[];
  body: string;
}

class TimeoutError extends Error {
  constructor() {
    super('Request timed out');
  }
}

export async function fetchPage(
  url: string,
  headers: Record<string, string>,
  { timeoutMs, maxBytes = MAX_BODY_BYTES }: FetchOptions
): Promise<FetchedPage> {
  const deadline = Date.now() + timeoutMs;
  const limit = Math.min(maxBytes, MAX_BODY_BYTES);
  const cookies = new Map<string, Map<string, string>>();
  let current = url;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const target = new URL(current);
    if (target.protocol !== 'https:' && target.protocol !== 'http:') {
      throw new Error(`Unsupported protocol ${target.protocol}`);
    }
    const remaining = deadline - Date.now();
    if (remaining <= 0) throw new TimeoutError();

    const jar = cookies.get(target.host);
    const cookieHeader = jar ? [...jar.values()].join('; ') : '';
    const res = await request(
      target,
      cookieHeader ? { ...headers, Cookie: cookieHeader } : headers,
      remaining,
      limit
    );

    if (res.setCookie.length > 0) {
      const hostJar = jar ?? new Map<string, string>();
      for (const cookie of res.setCookie) {
        const pair = cookie.split(';')[0].trim();
        const name = pair.split('=')[0];
        if (name) hostJar.set(name, pair);
      }
      cookies.set(target.host, hostJar);
    }

    if (REDIRECT_CODES.has(res.status) && res.location) {
      current = new URL(res.location, target).href;
      continue;
    }
    return { url: current, status: res.status, html: res.body };
  }
  throw new Error('Too many redirects');
}

async function request(
  target: URL,
  headers: Record<string, string>,
  timeoutMs: number,
  limit: number
): Promise<RawResponse> {
  if (target.protocol === 'https:' && !http1OnlyHosts.has(target.host)) {
    try {
      return await requestHttp2(target, headers, timeoutMs, limit);
    } catch (err) {
      if (err instanceof TimeoutError) throw err;
      // No HTTP/2 on this host (or the session failed) — use HTTP/1.1
      const code = (err as { code?: string }).code ?? '';
      if (code.startsWith('ERR_HTTP2')) http1OnlyHosts.add(target.host);
    }
  }
  return requestHttp1(target, headers, timeoutMs, limit);
}

function requestHttp2(
  target: URL,
  headers: Record<string, string>,
  timeoutMs: number,
  limit: number
): Promise<RawResponse> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const session = http2.connect(target.origin);

    const settle = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      session.destroy();
      fn();
    };
    const timer = setTimeout(() => settle(() => reject(new TimeoutError())), timeoutMs);

    session.on('error', (err) => settle(() => reject(err)));

    const lowerHeaders: Record<string, string> = {};
    for (const [key, value] of Object.entries(headers)) lowerHeaders[key.toLowerCase()] = value;

    const stream = session.request({
      ...lowerHeaders,
      ':method': 'GET',
      ':path': `${target.pathname}${target.search}`,
      'accept-encoding': 'gzip, deflate, br',
    });

    const chunks: Buffer[] = [];
    let size = 0;

    stream.on('error', (err) => settle(() => reject(err)));
    stream.on('response', (h) => {
      const finish = () => {
        const setCookie = h['set-cookie'];
        settle(() =>
          resolve({
            status: Number(h[':status'] ?? 0),
            location: typeof h.location === 'string' ? h.location : null,
            setCookie: Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : [],
            body: Buffer.concat(chunks).toString('utf8'),
          })
        );
      };

      // Decompress as it streams so we can stop early at `limit`
      const encoding = String(h['content-encoding'] ?? '').toLowerCase();
      const decoder =
        encoding === 'br'
          ? zlib.createBrotliDecompress()
          : encoding === 'gzip'
            ? zlib.createGunzip()
            : encoding === 'deflate'
              ? zlib.createInflate()
              : null;
      const body = decoder ? stream.pipe(decoder) : stream;

      body.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
        size += chunk.length;
        if (size >= limit) finish();
      });
      body.on('end', finish);
      // A mislabelled / truncated encoding still leaves usable HTML
      body.on('error', (err) => (size > 0 ? finish() : settle(() => reject(err))));
    });
    stream.end();
  });
}

async function requestHttp1(
  target: URL,
  headers: Record<string, string>,
  timeoutMs: number,
  limit: number
): Promise<RawResponse> {
  try {
    const res = await fetch(target, {
      headers,
      redirect: 'manual',
      signal: AbortSignal.timeout(timeoutMs),
    });

    let body = '';
    if (res.body) {
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let size = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.length;
        body += decoder.decode(value, { stream: true });
        if (size >= limit) {
          await reader.cancel();
          break;
        }
      }
      body += decoder.decode();
    }

    return {
      status: res.status,
      location: res.headers.get('location'),
      setCookie: res.headers.getSetCookie(),
      body,
    };
  } catch (err) {
    if (err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError')) {
      throw new TimeoutError();
    }
    throw err;
  }
}
