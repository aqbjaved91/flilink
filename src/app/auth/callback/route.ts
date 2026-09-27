// =============================================================================
// FLILINK — Auth Callback Route
// Handles magic link clicks or email confirmation redirects from Supabase
// =============================================================================

import { createClient } from '@/lib/supabase/server';
import { NextResponse, type NextRequest } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const tokenHash = requestUrl.searchParams.get('token_hash');
  const type = requestUrl.searchParams.get('type');

  const supabase = await createClient();

  // Exchange auth code for session
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  // Verify token hash if present
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as EmailOtpType,
    });
    if (!error) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  // Default redirect to dashboard
  return NextResponse.redirect(new URL('/dashboard', request.url));
}
