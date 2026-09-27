// =============================================================================
// FLILINK — Single Collection API Route
// =============================================================================
// PATCH:  Rename a collection and/or hide it (status 'archived') / unhide it
// DELETE: Permanently delete a collection (products + clicks cascade)
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { jsonError, requireUser } from '@/lib/api';

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const auth = await requireUser();
    if (auth.response) return auth.response;
    const { supabase, user } = auth;

    const body = await request.json().catch(() => ({}));
    const updates: Record<string, string> = {};

    if (body.name !== undefined) {
      const name = typeof body.name === 'string' ? body.name.trim() : '';
      if (!name) return jsonError('Collection name is required.');
      if (name.length > 60) return jsonError('Collection name is too long.');
      updates.name = name;
    }
    if (body.status !== undefined) {
      if (body.status !== 'active' && body.status !== 'archived') return jsonError('Invalid status.');
      updates.status = body.status;
    }
    if (Object.keys(updates).length === 0) return jsonError('Nothing to update.');

    const { data, error } = await supabase
      .from('collections')
      .update(updates)
      .eq('id', id)
      .eq('owner_id', user.id)
      .select('id')
      .maybeSingle();

    if (error) return jsonError('Could not update the collection.', 500);
    if (!data) return jsonError('Collection not found.', 404);
    return NextResponse.json({ success: true, ...updates });
  } catch {
    return jsonError('Something went wrong. Please try again.', 500);
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const auth = await requireUser();
    if (auth.response) return auth.response;
    const { supabase, user } = auth;

    const { error } = await supabase
      .from('collections')
      .delete()
      .eq('id', id)
      .eq('owner_id', user.id);

    if (error) return jsonError('Could not delete the collection.', 500);
    return NextResponse.json({ success: true });
  } catch {
    return jsonError('Something went wrong. Please try again.', 500);
  }
}
