// =============================================================================
// FLILINK — Metadata preview
// =============================================================================
// POST { url }: fetch title / image / price for a link without saving.
// Used by Edit Product's "refresh details" button.
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { jsonError, requireUser } from '@/lib/api';
import { isValidUrl } from '@/lib/utils';
import { fetchMetadataForUrl } from '@/lib/fetchers/metadata-service';

export const maxDuration = 30;

export async function POST(request: NextRequest) {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  const body = await request.json().catch(() => ({}));
  const url = typeof body.url === 'string' ? body.url.trim() : '';
  if (!isValidUrl(url)) return jsonError('Please enter a valid product link.');

  const result = await fetchMetadataForUrl(url);
  if (result.status === 'failed') return jsonError('Couldn’t fetch details from this link.', 422);
  return NextResponse.json(result);
}
