// =============================================================================
// FLILINK — Auth Screen
// Log in:  email → 8-digit email OTP → dashboard
// Sign up: name, Instagram, email, phone, city, state, pincode
//          → 8-digit email OTP → profile created → dashboard
// =============================================================================

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, AtSign, ChevronDown, CircleAlert, Mail } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { accountExists } from '@/app/(auth)/actions';
import { OTP_LENGTH, OTP_RESEND_COOLDOWN_SECONDS } from '@/lib/constants';
import { INDIAN_STATES } from '@/lib/india';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { AuthHero } from './AuthHero';
import { OtpInput } from './OtpInput';

type Mode = 'login' | 'signup';

interface SignupForm {
  fullName: string;
  instagram: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  pincode: string;
}

const EMPTY_FORM: SignupForm = {
  fullName: '',
  instagram: '',
  email: '',
  phone: '',
  city: '',
  state: '',
  pincode: '',
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateSignup(f: SignupForm): Partial<Record<keyof SignupForm, string>> {
  const errors: Partial<Record<keyof SignupForm, string>> = {};
  if (f.fullName.trim().length < 2) errors.fullName = 'Enter your full name';
  if (!/^[A-Za-z0-9._]{1,30}$/.test(f.instagram.trim().replace(/^@/, '')))
    errors.instagram = 'Enter a valid Instagram handle';
  if (!EMAIL_RE.test(f.email.trim())) errors.email = 'Enter a valid email address';
  if (!/^[6-9]\d{9}$/.test(f.phone)) errors.phone = 'Enter a valid 10-digit mobile number';
  if (f.city.trim().length < 2) errors.city = 'Enter your city';
  if (!f.state) errors.state = 'Select your state';
  if (!/^[1-9]\d{5}$/.test(f.pincode)) errors.pincode = 'Enter a valid 6-digit pincode';
  return errors;
}

function friendlyOtpError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('rate') || m.includes('security purposes'))
    return 'Too many attempts. Please wait a minute and try again.';
  if (m.includes('expired')) return 'This code has expired. Tap “Resend code” for a new one.';
  if (m.includes('invalid') || m.includes('token')) return 'Incorrect code. Please check and try again.';
  return message;
}

export function AuthScreen({ defaultMode = 'login' }: { defaultMode?: Mode }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(defaultMode);
  const [step, setStep] = useState<'details' | 'otp'>('details');

  const [loginEmail, setLoginEmail] = useState('');
  const [form, setForm] = useState<SignupForm>(EMPTY_FORM);
  const [touched, setTouched] = useState(false);

  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0);

  const email = (mode === 'login' ? loginEmail : form.email).trim().toLowerCase();
  const signupErrors = validateSignup(form);
  const signupValid = Object.keys(signupErrors).length === 0;
  const loginValid = EMAIL_RE.test(loginEmail.trim());

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const switchMode = (next: Mode) => {
    setMode(next);
    setStep('details');
    setError('');
    setOtp('');
    setTouched(false);
    // Keep the URL in sync so refresh / back land on the same screen
    window.history.replaceState(null, '', next === 'login' ? '/login' : '/signup');
  };

  const update = (key: keyof SignupForm, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (error) setError('');
  };

  // --- Send OTP --------------------------------------------------------------
  const sendOtp = async () => {
    setLoading(true);
    setError('');
    try {
      const exists = await accountExists(email);
      if (mode === 'login' && !exists) {
        setError('No account found with this email. Please create an account.');
        return;
      }
      if (mode === 'signup' && exists) {
        setError('An account with this email already exists. Please log in.');
        return;
      }

      const supabase = createClient();
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: mode === 'signup' },
      });
      if (otpError) {
        setError(friendlyOtpError(otpError.message));
        return;
      }

      setOtp('');
      setStep('otp');
      setCooldown(OTP_RESEND_COOLDOWN_SECONDS);
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDetailsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'signup') {
      setTouched(true);
      if (!signupValid) {
        // Take the creator straight to the first field that needs fixing
        requestAnimationFrame(() => {
          const first = document.querySelector<HTMLElement>('[aria-invalid="true"]');
          first?.focus();
          first?.scrollIntoView({ block: 'center', behavior: 'smooth' });
        });
        return;
      }
    } else if (!loginValid) {
      setError('Enter a valid email address.');
      return;
    }
    sendOtp();
  };

  // --- Verify OTP ------------------------------------------------------------
  const verify = async (code: string) => {
    if (code.length !== OTP_LENGTH || loading) return;
    setLoading(true);
    setError('');
    try {
      const supabase = createClient();
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token: code,
        type: 'email',
      });
      if (verifyError || !data.user) {
        setError(friendlyOtpError(verifyError?.message || 'Invalid code'));
        setOtp('');
        return;
      }

      if (mode === 'signup') {
        const { error: profileError } = await supabase.from('profiles').upsert(
          {
            user_id: data.user.id,
            email,
            full_name: form.fullName.trim(),
            instagram_username: form.instagram.trim().replace(/^@/, ''),
            phone_number: form.phone,
            city: form.city.trim(),
            state: form.state,
            pincode: form.pincode,
          },
          { onConflict: 'user_id' }
        );
        if (profileError) {
          setError('Your email is verified but we could not save your details. Please try again.');
          return;
        }
      }

      router.replace('/dashboard');
      router.refresh();
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const errorBanner = error && (
    <div className="animate-fade-up mb-4 flex items-start gap-2 rounded-2xl border border-red-100 bg-red-50 px-3.5 py-3 text-[13px] font-medium text-red-700">
      <CircleAlert className="mt-px h-4 w-4 shrink-0" />
      <span className="flex-1">
        {error}{' '}
        {error.includes('create an account') && (
          <button type="button" onClick={() => switchMode('signup')} className="font-bold underline">
            Sign up
          </button>
        )}
        {error.includes('Please log in') && (
          <button type="button" onClick={() => switchMode('login')} className="font-bold underline">
            Log in
          </button>
        )}
      </span>
    </div>
  );

  // ===========================================================================
  // OTP step
  // ===========================================================================
  if (step === 'otp') {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col bg-white px-5 pb-8">
        <div className="flex h-14 items-center">
          <button
            onClick={() => {
              setStep('details');
              setError('');
            }}
            aria-label="Go back"
            className="tap -ml-2 flex h-10 w-10 items-center justify-center rounded-full hover:bg-canvas"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        </div>

        <div className="animate-fade-up">
          <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand">
            <Mail className="h-7 w-7" />
          </div>
          <h1 className="text-[26px] font-extrabold tracking-tight text-ink">Check your email</h1>
          <p className="mt-2 text-[15px] leading-relaxed text-muted">
            Enter the {OTP_LENGTH}-digit code we sent to
            <br />
            <span className="font-semibold text-ink">{email}</span>
          </p>

          <div className="mt-8">
            {errorBanner}
            <OtpInput
              length={OTP_LENGTH}
              value={otp}
              onChange={(v) => {
                setOtp(v);
                if (error) setError('');
              }}
              onComplete={verify}
              error={!!error}
              disabled={loading}
            />
          </div>

          <Button
            fullWidth
            className="mt-6"
            disabled={otp.length !== OTP_LENGTH}
            loading={loading}
            onClick={() => verify(otp)}
          >
            {mode === 'signup' ? 'Verify & create account' : 'Verify & log in'}
          </Button>

          <p className="mt-6 text-center text-sm text-muted">
            Didn’t get the code?{' '}
            {cooldown > 0 ? (
              <span className="font-semibold text-ink">Resend in {cooldown}s</span>
            ) : (
              <button
                onClick={sendOtp}
                disabled={loading}
                className="font-semibold text-brand hover:underline"
              >
                Resend code
              </button>
            )}
          </p>
          <p className="mt-2 text-center text-xs text-subtle">Check your spam folder too.</p>
        </div>
      </div>
    );
  }

  // ===========================================================================
  // Log in
  // ===========================================================================
  if (mode === 'login') {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col bg-gradient-to-b from-[#fff4f1] via-[#fff8f6] to-white">
        <AuthHero />
        <div className="animate-sheet-up rounded-t-[32px] bg-white px-5 pb-8 pt-3 shadow-[0_-12px_40px_rgba(17,24,39,0.06)]">
          <div className="mx-auto mb-6 h-1 w-10 rounded-full bg-line" />
          <h1 className="text-[24px] font-extrabold leading-tight tracking-tight text-ink">
            Welcome back
          </h1>
          <p className="mt-1.5 text-[15px] text-muted">Log in with your email to continue</p>

          <form onSubmit={handleDetailsSubmit} className="mt-6" noValidate>
            {errorBanner}
            <Field
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={loginEmail}
              onChange={(e) => {
                setLoginEmail(e.target.value);
                if (error) setError('');
              }}
              leading={<Mail className="h-[18px] w-[18px]" />}
            />
            <Button type="submit" fullWidth className="mt-4" disabled={!loginValid} loading={loading}>
              Get OTP <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted">
            New to Flilink?{' '}
            <button onClick={() => switchMode('signup')} className="font-bold text-brand hover:underline">
              Create an account
            </button>
          </p>
        </div>
      </div>
    );
  }

  // ===========================================================================
  // Sign up
  // ===========================================================================
  const showError = (key: keyof SignupForm) => (touched ? signupErrors[key] : undefined);

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col bg-gradient-to-b from-[#fff4f1] to-white">
      <AuthHero compact />
      <div className="animate-sheet-up flex-1 rounded-t-[32px] bg-white px-5 pb-10 pt-6 shadow-[0_-12px_40px_rgba(17,24,39,0.06)]">
        <h1 className="text-[24px] font-extrabold leading-tight tracking-tight text-ink">
          Create your account
        </h1>
        <p className="mt-1.5 text-[15px] text-muted">Start organising your links in minutes</p>

        <form onSubmit={handleDetailsSubmit} className="mt-6 space-y-4" noValidate>
          {errorBanner}
          <Field
            label="Full name"
            autoComplete="name"
            placeholder="e.g. Priya Sharma"
            value={form.fullName}
            onChange={(e) => update('fullName', e.target.value)}
            error={showError('fullName')}
          />
          <Field
            label="Instagram handle"
            autoCapitalize="none"
            autoCorrect="off"
            placeholder="yourhandle"
            value={form.instagram}
            onChange={(e) => update('instagram', e.target.value.replace(/\s/g, ''))}
            leading={<AtSign className="h-[18px] w-[18px]" />}
            error={showError('instagram')}
          />
          <Field
            label="Email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={(e) => update('email', e.target.value)}
            error={showError('email')}
          />
          <Field
            label="Phone number"
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            placeholder="98765 43210"
            value={form.phone}
            onChange={(e) => update('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
            leading={<span className="text-[15px] font-semibold text-ink-2">+91</span>}
            error={showError('phone')}
          />
          <div className="grid grid-cols-2 gap-3">
            <Field
              label="City"
              autoComplete="address-level2"
              placeholder="Mumbai"
              value={form.city}
              onChange={(e) => update('city', e.target.value)}
              error={showError('city')}
            />
            <Field
              label="Pincode"
              inputMode="numeric"
              autoComplete="postal-code"
              placeholder="400001"
              value={form.pincode}
              onChange={(e) => update('pincode', e.target.value.replace(/\D/g, '').slice(0, 6))}
              error={showError('pincode')}
            />
          </div>
          <div>
            <label htmlFor="state" className="mb-1.5 block text-[13px] font-semibold text-ink-2">
              State
            </label>
            <div className="relative">
              <select
                id="state"
                value={form.state}
                onChange={(e) => update('state', e.target.value)}
                aria-invalid={showError('state') ? true : undefined}
                className={cn(
                  'h-13 w-full appearance-none rounded-2xl border bg-white px-4 pr-10 text-[16px] outline-none transition-colors',
                  'focus:border-ink focus:ring-4 focus:ring-ink/5',
                  form.state ? 'text-ink' : 'text-subtle',
                  showError('state') ? 'border-red-400' : 'border-line'
                )}
              >
                <option value="" disabled>
                  Select state
                </option>
                {INDIAN_STATES.map((s) => (
                  <option key={s} value={s} className="text-ink">
                    {s}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            </div>
            {showError('state') && (
              <p className="mt-1.5 text-xs font-medium text-red-600">{showError('state')}</p>
            )}
          </div>

          <Button type="submit" fullWidth className="!mt-6" loading={loading}>
            Send OTP <ArrowRight className="h-4 w-4" />
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted">
          Already have an account?{' '}
          <button onClick={() => switchMode('login')} className="font-bold text-brand hover:underline">
            Log in
          </button>
        </p>
      </div>
    </div>
  );
}
