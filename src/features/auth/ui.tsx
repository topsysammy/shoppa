import { forwardRef, useState, type ComponentProps, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { IconButton } from '@/components/IconButton';
import { Icon, type IconName } from '@/components/icons/Icon';
import { Input } from '@/components/Input';
import { cn } from '@/lib/cn';
import { useOnline } from '@/lib/useOnline';
import googleLogo from '@/assets/auth/google.svg';
import appleLogo from '@/assets/auth/apple.svg';

/** A2: Continue with Apple is P2 and stays hidden until VITE_ENABLE_APPLE=true. */
export const appleEnabled = import.meta.env.VITE_ENABLE_APPLE === 'true';

type AuthLayoutProps = {
  title: string;
  subtitle?: ReactNode;
  /** Round icon above the title (screen 08 lock). */
  icon?: IconName;
  back?: boolean | string;
  children: ReactNode;
};

/**
 * Shared frame for screens 06, 07, 08, 10 and 11: canvas header with back
 * button, title and subtitle, then a white panel with 32px top corners.
 * From 640px the panel becomes a centred 440px card.
 */
export function AuthLayout({ title, subtitle, icon, back = true, children }: AuthLayoutProps) {
  const navigate = useNavigate();
  return (
    <div className="flex min-h-dvh flex-col canvas-gradient tablet:items-center tablet:justify-center tablet:py-10">
      <div className="flex w-full flex-1 flex-col tablet:max-w-[440px] tablet:flex-none">
        <header className="relative flex flex-col items-center gap-1.5 px-5 pb-6 pt-[max(116px,calc(env(safe-area-inset-top)+104px))] text-center tablet:pt-16">
          {back ? (
            <span className="absolute left-5 top-[max(52px,calc(env(safe-area-inset-top)+12px))] tablet:top-0">
              <IconButton icon="back" label="Back" onClick={() => (typeof back === 'string' ? navigate(back) : navigate(-1))} />
            </span>
          ) : null}
          {icon ? (
            <span className="mb-2.5 inline-flex size-[60px] items-center justify-center rounded-full border border-line bg-surface text-ink">
              <Icon name={icon} size={26} />
            </span>
          ) : null}
          <h1 className="text-[26px] font-semibold leading-8 tracking-[-0.52px] text-ink">{title}</h1>
          {subtitle ? <p className="px-5 type-body text-secondary">{subtitle}</p> : null}
        </header>
        <main className="flex flex-1 flex-col gap-4 rounded-t-32 bg-surface px-5 pb-[max(36px,env(safe-area-inset-bottom))] pt-6 tablet:flex-none tablet:rounded-32 tablet:p-8 tablet:shadow-card">
          {children}
        </main>
      </div>
    </div>
  );
}

/** Pushes the following content to the bottom of the panel on phone (Figma spacer). */
export function Spacer() {
  return <div className="min-h-4 flex-1 tablet:hidden" aria-hidden />;
}

export function OrDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3" role="separator" aria-label={label}>
      <span className="h-px flex-1 bg-line" />
      <span className="type-caption text-tertiary">{label}</span>
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}

type SocialProps = { provider: 'google' | 'apple'; label: string; onClick: () => void; disabled?: boolean; busy?: boolean; compact?: boolean };

/** Google / Apple buttons from screens 02, 06 and 07 (Figma brand marks). */
export function SocialButton({ provider, label, onClick, disabled, busy, compact }: SocialProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      className={cn(
        'focus-ring flex h-[54px] min-w-0 shrink-0 items-center justify-center gap-2.5 rounded-16 border border-line-strong bg-surface text-[15px] font-semibold leading-[22px] text-ink transition-colors hover:bg-muted',
        'disabled:cursor-not-allowed disabled:opacity-50',
        compact ? 'flex-1 px-3' : 'w-full px-5',
      )}
    >
      {provider === 'google' ? (
        <img src={googleLogo} width={22} height={22} alt="" />
      ) : (
        <img src={appleLogo} width={22} height={27} alt="" className="dark:invert" />
      )}
      <span>{label}</span>
    </button>
  );
}

export function TextLink({ to, children, className, ...rest }: ComponentProps<typeof Link>) {
  return (
    <Link
      to={to}
      className={cn('focus-ring rounded-[6px] font-semibold text-link underline-offset-2 hover:underline', className)}
      {...rest}
    >
      {children}
    </Link>
  );
}

/** "By continuing you agree to our Terms and Privacy Policy." (PRD section 8: policy linked from sign-up). */
export function LegalNote() {
  return (
    <p className="text-center text-[12px] leading-[18px] text-secondary">
      By continuing you agree to our{' '}
      <Link to="/legal/terms" className="focus-ring rounded-[4px] text-link underline-offset-2 hover:underline">
        Terms
      </Link>{' '}
      and{' '}
      <Link to="/legal/privacy" className="focus-ring rounded-[4px] text-link underline-offset-2 hover:underline">
        Privacy Policy
      </Link>
      .
    </p>
  );
}

/** Calm notice for auth screens, which need a connection (PRD section 8 offline exceptions). */
export function OfflineNote() {
  const online = useOnline();
  if (online) return null;
  return (
    <p role="status" className="flex items-center gap-2 rounded-12 bg-muted px-3 py-2.5 type-caption text-body">
      <Icon name="wifi-off" size={18} />
      You&rsquo;re offline. Signing in needs a connection; your saved lists still open.
    </p>
  );
}

export function FormError({ message }: { message: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="flex items-start gap-2 type-caption text-danger">
      <Icon name="alert" size={18} className="shrink-0" />
      <span>{message}</span>
    </p>
  );
}

type PasswordInputProps = Omit<ComponentProps<typeof Input>, 'type' | 'trailing'>;

/** Password field with a show/hide toggle. */
export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(function PasswordInput(props, ref) {
  const [show, setShow] = useState(false);
  return (
    <Input
      ref={ref}
      type={show ? 'text' : 'password'}
      trailing={
        <IconButton
          variant="ghost"
          icon="eye"
          label={show ? 'Hide password' : 'Show password'}
          aria-pressed={show}
          onClick={() => setShow((s) => !s)}
        />
      }
      {...props}
    />
  );
});

/** Password rule from Figma helper text: at least 8 characters, with a number. */
export const passwordRules = (pw: string, confirm?: string) => ({
  length: pw.length >= 8,
  number: /\d/.test(pw),
  match: confirm === undefined ? true : pw.length > 0 && pw === confirm,
});

export function PasswordChecklist({ password, confirm }: { password: string; confirm: string }) {
  const r = passwordRules(password, confirm);
  const items: Array<[boolean, string]> = [
    [r.length, 'At least 8 characters'],
    [r.number, 'Contains a number'],
    [r.match, 'Passwords match'],
  ];
  return (
    <ul className="flex flex-col gap-2.5 py-1" aria-label="Password requirements">
      {items.map(([ok, label]) => (
        <li key={label} className="flex items-center gap-2">
          <span
            className={cn(
              'inline-flex size-[18px] items-center justify-center rounded-full',
              ok ? 'bg-brand-strong text-white' : 'border-[1.5px] border-line-check',
            )}
            aria-hidden
          >
            {ok ? <Icon name="check" size={10} strokeWidth={3.6} /> : null}
          </span>
          <span className="text-[13px] font-medium leading-[18px] text-body">
            {label}
            <span className="sr-only">{ok ? ', done' : ', not yet'}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Webmail inbox for the "Open email app" button (screen 09); null when unknown. */
export function inboxUrl(email: string): string | null {
  const domain = email.split('@')[1]?.toLowerCase() ?? '';
  if (domain === 'gmail.com' || domain === 'googlemail.com') return 'https://mail.google.com/mail/u/0/#inbox';
  if (domain.startsWith('yahoo.') || domain === 'ymail.com') return 'https://mail.yahoo.com/';
  if (['outlook.com', 'hotmail.com', 'live.com', 'msn.com'].includes(domain)) return 'https://outlook.live.com/mail/';
  if (domain === 'icloud.com' || domain === 'me.com') return 'https://www.icloud.com/mail';
  return null;
}
