// =============================================================================
// FLILINK — Profile
// Account details (read-only except mobile number), Log out, Delete account.
// =============================================================================

'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { AtSign, Building2, Hash, LogOut, Mail, MapPin, Pencil, Phone, Trash2, TriangleAlert } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/Dialog';
import { useToast } from '@/components/ui/Toast';
import { deleteAccount, logout, updatePhoneNumber } from '@/app/(auth)/actions';
import { cn } from '@/lib/utils';

interface ProfileViewProps {
  profile: {
    full_name: string;
    email: string;
    phone_number: string;
    instagram_username: string;
    city: string;
    state: string;
    pincode: string;
  };
}

function formatPhone(digits: string) {
  return digits.length === 10 ? `+91 ${digits.slice(0, 5)} ${digits.slice(5)}` : digits || '—';
}

export function ProfileView({ profile }: ProfileViewProps) {
  const router = useRouter();
  const toast = useToast();

  const [phone, setPhone] = useState(profile.phone_number);
  const [editingPhone, setEditingPhone] = useState(false);
  const [draftPhone, setDraftPhone] = useState(profile.phone_number);
  const [phoneError, setPhoneError] = useState('');
  const [savingPhone, setSavingPhone] = useState(false);

  const [confirm, setConfirm] = useState<'logout' | 'delete' | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [loggingOut, startLogout] = useTransition();

  const initials = (profile.full_name || profile.email || 'C').trim().charAt(0).toUpperCase();
  const phoneValid = /^[6-9]\d{9}$/.test(draftPhone);

  const savePhone = async () => {
    if (!phoneValid) return setPhoneError('Enter a valid 10-digit mobile number');
    setSavingPhone(true);
    const result = await updatePhoneNumber(draftPhone);
    setSavingPhone(false);
    if (!result.success) return setPhoneError(result.error || 'Could not update your number');
    setPhone(draftPhone);
    setEditingPhone(false);
    toast('Mobile number updated');
    router.refresh();
  };

  const removeAccount = async () => {
    setDeleting(true);
    const result = await deleteAccount();
    if (!result.success) {
      setDeleting(false);
      toast(result.error || 'Could not delete your account', 'error');
      return;
    }
    router.replace('/login');
    router.refresh();
  };

  const rows = [
    { icon: Mail, label: 'Email', value: profile.email },
    { icon: AtSign, label: 'Instagram', value: profile.instagram_username ? `@${profile.instagram_username}` : '—' },
    { icon: Building2, label: 'City', value: profile.city || '—' },
    { icon: MapPin, label: 'State', value: profile.state || '—' },
    { icon: Hash, label: 'Pincode', value: profile.pincode || '—' },
  ];

  return (
    <div className="pb-12">
      <PageHeader title="Profile" />

      <section className="px-4 pt-5">
        <div className="animate-fade-up flex flex-col items-center rounded-[28px] bg-white px-5 py-7 text-center shadow-card">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-50 text-3xl font-extrabold text-brand ring-4 ring-brand-100/60">
            {initials}
          </div>
          <h2 className="mt-4 text-xl font-bold text-ink">{profile.full_name || 'Creator'}</h2>
          {profile.instagram_username && (
            <p className="mt-0.5 text-sm text-muted">@{profile.instagram_username}</p>
          )}
        </div>
      </section>

      <section className="px-4 pt-4">
        <div className="animate-fade-up overflow-hidden rounded-[28px] bg-white shadow-card">
          {/* Mobile number — the only editable field */}
          <div className="border-b border-line/70 px-4 py-3.5">
            <div className="flex items-center gap-3.5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-canvas text-ink-2">
                <Phone className="h-[18px] w-[18px]" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted">Mobile number</p>
                {!editingPhone && <p className="text-[15px] font-semibold text-ink">{formatPhone(phone)}</p>}
              </div>
              {!editingPhone && (
                <button
                  onClick={() => {
                    setDraftPhone(phone);
                    setPhoneError('');
                    setEditingPhone(true);
                  }}
                  className="tap flex h-9 items-center gap-1.5 rounded-full bg-brand-50 px-3.5 text-[13px] font-bold text-brand"
                >
                  <Pencil className="h-3.5 w-3.5" /> Update
                </button>
              )}
            </div>

            {editingPhone && (
              <div className="animate-fade-up mt-3">
                <div
                  className={cn(
                    'flex h-12 items-center gap-2 rounded-2xl border bg-white px-4 focus-within:border-ink focus-within:ring-4 focus-within:ring-ink/5',
                    phoneError ? 'border-red-400' : 'border-line'
                  )}
                >
                  <span className="text-[15px] font-semibold text-ink-2">+91</span>
                  <input
                    autoFocus
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel-national"
                    value={draftPhone}
                    onChange={(e) => {
                      setDraftPhone(e.target.value.replace(/\D/g, '').slice(0, 10));
                      setPhoneError('');
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && savePhone()}
                    className="h-full w-full bg-transparent text-[16px] text-ink outline-none"
                  />
                </div>
                {phoneError && <p className="mt-1.5 text-xs font-medium text-red-600">{phoneError}</p>}
                <div className="mt-3 grid grid-cols-2 gap-2.5">
                  <Button variant="secondary" size="md" onClick={() => setEditingPhone(false)} disabled={savingPhone}>
                    Cancel
                  </Button>
                  <Button
                    size="md"
                    onClick={savePhone}
                    loading={savingPhone}
                    disabled={!phoneValid || draftPhone === phone}
                  >
                    Save
                  </Button>
                </div>
              </div>
            )}
          </div>

          {rows.map((row, i) => (
            <div
              key={row.label}
              className={cn('flex items-center gap-3.5 px-4 py-3.5', i < rows.length - 1 && 'border-b border-line/70')}
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-canvas text-ink-2">
                <row.icon className="h-[18px] w-[18px]" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted">{row.label}</p>
                <p className="truncate text-[15px] font-semibold text-ink">{row.value}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-2 px-2 text-xs text-muted">Only your mobile number can be updated.</p>
      </section>

      <section className="space-y-2.5 px-4 pt-6">
        <Button variant="secondary" fullWidth onClick={() => setConfirm('logout')} loading={loggingOut}>
          <LogOut className="h-[18px] w-[18px]" /> Log out
        </Button>
        <button
          onClick={() => setConfirm('delete')}
          className="tap flex h-13 w-full items-center justify-center gap-2 rounded-2xl text-[15px] font-semibold text-red-600 hover:bg-red-50"
        >
          <Trash2 className="h-[18px] w-[18px]" /> Delete account
        </button>
      </section>

      <ConfirmDialog
        open={confirm === 'logout'}
        icon={LogOut}
        title="Log out?"
        message="You can log back in anytime with your email."
        confirmLabel="Log out"
        loading={loggingOut}
        onCancel={() => setConfirm(null)}
        onConfirm={() => startLogout(() => logout())}
      />
      <ConfirmDialog
        open={confirm === 'delete'}
        icon={TriangleAlert}
        title="Delete your account?"
        message="This permanently deletes your account, all your collections and their storefront links. This can’t be undone."
        confirmLabel="Delete"
        confirmVariant="danger"
        loading={deleting}
        onCancel={() => setConfirm(null)}
        onConfirm={removeAccount}
      />
    </div>
  );
}
