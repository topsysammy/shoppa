import { forwardRef, useEffect, useRef, useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/Button';
import { Icon } from '@/components/icons/Icon';
import { cn } from '@/lib/cn';
import { supabase } from '@/lib/supabase/client';
import { authMessage } from '@/lib/supabase/errors';
import { keys, session as sessionStore } from '@/lib/storage';
import { useOnline } from '@/lib/useOnline';
import haloOuter from '@/assets/auth/halo-outer.svg';
import haloInner from '@/assets/auth/halo-inner.svg';
import { firstName, useAuth } from './AuthProvider';
import { AuthLayout, FormError, OfflineNote, Spacer } from './ui';
import { useResendTimer } from './useResendTimer';

const LENGTH = 6;

/**
 * A7: Verify email accepts the 6-digit code (screen 11) or the emailed link
 * (handled by /auth/confirm). Success shows screen 12 Account created.
 */
export function VerifyEmail() {
  const { session, loading, displayName } = useAuth();
  const [params] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const online = useOnline();
  const email = ((location.state as { email?: string } | null)?.email ?? sessionStore.get(keys.pendingEmail) ?? '').trim();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(params.get('done') === '1');
  const timer = useResendTimer();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    timer.start(); // the sign-up email was just sent
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (done || (session && params.get('done') === '1')) return <AccountCreated name={firstName(displayName)} />;
  if (!loading && session) return <Navigate to="/home" replace />;
  if (!email) return <Navigate to="/signup" replace />;

  const verify = async (value = code) => {
    setError('');
    if (value.length !== LENGTH) return setError('Enter all 6 digits.');
    setBusy(true);
    const { error: err } = await supabase.auth.verifyOtp({ email, token: value, type: 'email' });
    setBusy(false);
    if (err) {
      setError(authMessage(err));
      setCode('');
      inputRef.current?.focus();
      return;
    }
    sessionStore.remove(keys.pendingEmail);
    setDone(true);
  };

  const resend = async () => {
    setError('');
    const { error: err } = await supabase.auth.resend({ type: 'signup', email });
    if (err) return setError(authMessage(err));
    timer.start();
  };

  return (
    <AuthLayout
      title="Verify your email"
      subtitle={
        <>
          Enter the 6-digit code we sent to <strong className="font-semibold text-ink">{email}</strong>
        </>
      }
      back="/signup"
    >
      <form
        noValidate
        className="flex flex-1 flex-col gap-5 pt-1"
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          void verify();
        }}
      >
        <CodeInput
          ref={inputRef}
          value={code}
          invalid={Boolean(error)}
          onChange={(v) => {
            setCode(v);
            if (v.length === LENGTH) void verify(v);
          }}
        />
        <p className="text-center text-[14px] leading-5 text-secondary">
          Didn&rsquo;t get a code?{' '}
          <button
            type="button"
            onClick={resend}
            disabled={timer.left > 0 || !online}
            className="focus-ring rounded-[6px] font-semibold text-link disabled:text-secondary"
          >
            {timer.left > 0 ? `Resend in ${timer.label}` : 'Resend code'}
          </button>
        </p>
        <p className="text-center type-caption text-secondary">You can also tap the link in the email.</p>
        <FormError message={error} />
        <OfflineNote />
        <Spacer />
        <Button type="submit" loading={busy} disabled={!online}>
          Verify email
        </Button>
        <button type="button" onClick={() => navigate('/signup')} className="focus-ring mx-auto rounded-12 px-3 py-2 type-label text-link">
          Use a different email
        </button>
      </form>
    </AuthLayout>
  );
}

type CodeInputProps = { value: string; onChange: (v: string) => void; invalid?: boolean };

/**
 * One real input (autocomplete="one-time-code", numeric keypad, paste-friendly)
 * drawn as six Figma digit boxes. Screen readers hear a single field.
 */
const CodeInput = forwardRef<HTMLInputElement, CodeInputProps>(function CodeInput({ value, onChange, invalid }, ref) {
  const [focused, setFocused] = useState(false);
  return (
    <label className="relative block">
      <span className="sr-only">6-digit code</span>
      <input
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, LENGTH))}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]*"
        maxLength={LENGTH}
        autoFocus
        aria-invalid={invalid || undefined}
        className="absolute inset-0 z-10 h-full w-full cursor-text opacity-0"
      />
      <span className="flex justify-between gap-2" aria-hidden>
        {Array.from({ length: LENGTH }, (_, i) => {
          const char = value[i] ?? '';
          const active = focused && (i === value.length || (i === LENGTH - 1 && value.length === LENGTH));
          return (
            <span
              key={i}
              className={cn(
                'flex h-[58px] w-12 items-center justify-center rounded-[14px] text-[22px] font-semibold leading-7 text-ink',
                active ? 'border-[1.5px] border-brand-strong bg-surface' : 'border border-code-line bg-code',
                invalid && 'border-danger',
              )}
            >
              {char}
            </span>
          );
        })}
      </span>
    </label>
  );
});

/** Screen 12 Account created. */
function AccountCreated({ name }: { name: string }) {
  const navigate = useNavigate();
  // H3: signed up from an invite link, so go straight back and join.
  useEffect(() => {
    const token = sessionStore.get('shoppa.pendingJoin');
    if (token) navigate(`/join/${token}?accept=1`, { replace: true });
  }, [navigate]);
  return (
    <div className="flex min-h-dvh flex-col items-center success-gradient">
      <main className="flex w-full max-w-[440px] flex-1 flex-col gap-2.5 px-5 pb-10 pt-[max(52px,env(safe-area-inset-top))]">
        <div className="flex flex-1 flex-col items-center justify-center gap-3.5 text-center" role="status">
          <span className="relative size-[104px]">
            <img src={haloOuter} alt="" width={164} height={164} className="absolute -left-[30px] -top-[30px] max-w-none" />
            <img src={haloInner} alt="" width={132} height={132} className="absolute -left-[14px] -top-[14px] max-w-none" />
            <span className="absolute inset-0 inline-flex items-center justify-center rounded-full bg-brand-strong text-white">
              <Icon name="check" size={50} strokeWidth={1.3} />
            </span>
          </span>
          <h1 className="pt-9 text-[26px] font-semibold leading-8 tracking-[-0.5px] text-ink">
            You&rsquo;re all set{name ? `, ${name}` : ''}
          </h1>
          <p className="max-w-[326px] px-5 type-body text-secondary">
            Your account is ready. Start your first list and add things as you remember them.
          </p>
        </div>
        <Button onClick={() => navigate('/lists/new', { replace: true })}>Create my first list</Button>
        <Button variant="secondary" onClick={() => navigate('/home', { replace: true })}>
          Go to Home
        </Button>
      </main>
    </div>
  );
}
