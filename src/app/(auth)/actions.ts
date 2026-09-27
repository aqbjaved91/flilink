// =============================================================================
// FLILINK — Auth & Account Server Actions
// =============================================================================
// OTP send/verify happens in the browser client (so the session cookie is set
// there). These actions cover the parts that need the server: account lookup,
// profile updates, logout and account deletion.
// =============================================================================

'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export interface AuthActionResult {
  success: boolean;
  error?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Whether a creator account (profile) already exists for this email.
 * Used to send log-in attempts for unknown emails to sign up, and vice versa.
 */
export async function accountExists(email: string): Promise<boolean> {
  const clean = email.trim().toLowerCase();
  if (!EMAIL_RE.test(clean)) return false;

  const admin = createAdminClient();
  const { data } = await admin
    .from('profiles')
    .select('id')
    .eq('email', clean)
    .limit(1)
    .maybeSingle();

  return !!data;
}

/** Only the phone number is editable after sign up. */
export async function updatePhoneNumber(phone: string): Promise<AuthActionResult> {
  const digits = phone.replace(/\D/g, '').replace(/^91(?=\d{10}$)/, '');
  if (!/^[6-9]\d{9}$/.test(digits)) {
    return { success: false, error: 'Enter a valid 10-digit mobile number.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Your session has expired. Please log in again.' };

  const { error } = await supabase
    .from('profiles')
    .update({ phone_number: digits })
    .eq('user_id', user.id);

  if (error) return { success: false, error: 'Could not update your number. Please try again.' };
  return { success: true };
}

export async function logout(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}

/**
 * Permanently delete the signed-in creator. Collections, products and click
 * events are removed by ON DELETE CASCADE from auth.users.
 */
export async function deleteAccount(): Promise<AuthActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Your session has expired. Please log in again.' };

  const admin = createAdminClient();

  // Remove any custom product images this creator uploaded
  const { data: files } = await admin.storage.from('product-images').list(user.id, { limit: 1000 });
  if (files && files.length > 0) {
    await admin.storage.from('product-images').remove(files.map((f) => `${user.id}/${f.name}`));
  }

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return { success: false, error: 'Could not delete your account. Please try again.' };

  // The user no longer exists server-side, so just clear this device's session
  await supabase.auth.signOut({ scope: 'local' });
  return { success: true };
}
