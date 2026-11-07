import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/Button';
import { appleEnabled, FormError, LegalNote, OfflineNote, SocialButton } from '@/features/auth/ui';
import { useOAuth } from '@/features/auth/oauth';
import { useOnline } from '@/lib/useOnline';

/**
 * A2: Welcome offers Sign up, Log in and Continue with Google.
 * Continue with Apple (P2) shows only when VITE_ENABLE_APPLE=true.
 * Used under the intro slides (screen 02) and on Welcome (screen 05).
 */
export function WelcomeActions() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;
  const online = useOnline();
  const oauth = useOAuth(from ?? '/home');
  return (
    <div className="flex w-full flex-col gap-2.5">
      <OfflineNote />
      <SocialButton provider="google" label="Continue with Google" onClick={() => oauth.start('google')} busy={oauth.busy === 'google'} disabled={!online} />
      {appleEnabled ? (
        <SocialButton provider="apple" label="Continue with Apple" onClick={() => oauth.start('apple')} busy={oauth.busy === 'apple'} disabled={!online} />
      ) : null}
      <Button onClick={() => navigate('/signup', { state: location.state })}>Sign up with email</Button>
      <FormError message={oauth.error} />
      <p className="pt-2 text-center text-[14px] leading-5 text-secondary">
        Already have an account?{' '}
        <Link to="/login" state={location.state} className="focus-ring rounded-[6px] font-semibold text-brand-text underline-offset-2 hover:underline">
          Sign in
        </Link>
      </p>
      <LegalNote />
    </div>
  );
}
