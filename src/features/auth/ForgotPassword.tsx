import { useState, type FormEvent } from 'react';
import { useLocation } from 'react-router-dom';
import { Button } from '@/components/Button';
import { Icon } from '@/components/icons/Icon';
import { Input } from '@/components/Input';
import { appUrl, supabase } from '@/lib/supabase/client';
import { authMessage } from '@/lib/supabase/errors';
import { useOnline } from '@/lib/useOnline';
import badgeDot from '@/assets/auth/badge-dot.svg';
import { AuthLayout, FormError, inboxUrl, OfflineNote, Spacer, TextLink } from './ui';
import { useResendTimer } from './useResendTimer';

/** Screens 08 Forgot password and 09 Reset link sent (route /forgot). */
export function ForgotPassword() {
  const location = useLocation();
  const online = useOnline();
  const [email, setEmail] = useState(((location.state as { email?: string } | null)?.email ?? '').trim());
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const timer = useResendTimer();

  const send = async () => {
    setError('');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setError('Enter a valid email address.');
    setBusy(true);
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: appUrl('/reset') });
    setBusy(false);
    if (err) return setError(authMessage(err));
    setSent(true);
    timer.start();
  };

  if (sent) {
    const inbox = inboxUrl(email);
    return (
      <div className="flex min-h-dvh flex-col items-center canvas-gradient">
        <main className="flex w-full max-w-[440px] flex-1 flex-col gap-2.5 px-5 pb-10 pt-[max(52px,env(safe-area-inset-top))]">
          <div className="flex flex-1 flex-col items-center justify-center gap-3.5 text-center" role="status">
            <span className="relative inline-flex size-24 items-center justify-center rounded-full border border-line bg-surface text-ink shadow-[0_10px_15px_rgb(20_20_30/0.06)]">
              <Icon name="mail" size={40} />
              <img src={badgeDot} alt="" width={22} height={22} className="absolute left-[69px] top-[3px]" />
            </span>
            <h1 className="pt-2.5 text-[26px] font-semibold leading-8 tracking-[-0.5px] text-ink">Check your email</h1>
            <p className="max-w-[326px] type-body text-secondary">
              We sent a reset link to <strong className="font-semibold text-ink">{email}</strong>. It expires in 30 minutes.
            </p>
          </div>
          {inbox ? (
            <a
              href={inbox}
              target="_blank"
              rel="noreferrer"
              className="focus-ring inline-flex h-[54px] w-full items-center justify-center gap-2 rounded-16 bg-brand-strong px-5 type-body-strong text-on-brand hover:brightness-110"
            >
              Open email app
            </a>
          ) : null}
          <FormError message={error} />
          <Button variant={inbox ? 'secondary' : 'primary'} onClick={send} loading={busy} disabled={!online || timer.left > 0}>
            {timer.left > 0 ? `Resend link in ${timer.label}` : 'Resend link'}
          </Button>
          <p className="pt-1 text-center type-caption text-secondary">Didn&rsquo;t get it? Check your spam folder.</p>
          <p className="text-center">
            <TextLink to="/login" className="inline-block px-2 py-2 text-[15px] leading-[22px]">
              Back to sign in
            </TextLink>
          </p>
        </main>
      </div>
    );
  }

  return (
    <AuthLayout icon="lock" title="Forgot password?" subtitle="Enter your email and we’ll send you a link to reset it." back="/login">
      <form
        noValidate
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          void send();
        }}
        className="flex flex-1 flex-col gap-4"
      >
        <Input
          label="Email address"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={error || undefined}
          placeholder="you@email.com"
        />
        <OfflineNote />
        <Spacer />
        <Button type="submit" loading={busy} disabled={!online}>
          Send reset link
        </Button>
        <p className="text-center">
          <TextLink to="/login" className="inline-block px-2 py-2 text-[15px] leading-[22px]">
            Back to sign in
          </TextLink>
        </p>
      </form>
    </AuthLayout>
  );
}
