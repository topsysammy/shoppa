import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { EmailOtpType } from '@supabase/supabase-js';
import { Logo } from '@/components/Logo';
import { supabase } from '@/lib/supabase/client';
import { authMessage } from '@/lib/supabase/errors';
import { Button } from '@/components/Button';
import { AuthLayout, Spacer, TextLink } from './ui';

const allowed: EmailOtpType[] = ['email', 'signup', 'recovery', 'email_change', 'invite', 'magiclink'];

/**
 * /auth/confirm?token_hash=…&type=…&next=… — target of the links in the
 * Supabase email templates (supabase/templates). Using token_hash works even
 * when the email is opened in a different browser from the one that signed up.
 * Used for password-reset and email-change links; a recovery link opens screen 10.
 */
export function AuthConfirm() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    const tokenHash = params.get('token_hash');
    const type = params.get('type') as EmailOtpType | null;
    const next = params.get('next');
    if (!tokenHash || !type || !allowed.includes(type)) {
      setError('This link is incomplete. Open it again from the email.');
      return;
    }
    void supabase.auth.verifyOtp({ token_hash: tokenHash, type }).then(({ error: err }) => {
      if (err) return setError(authMessage(err));
      // `next` is a path, or the full emailRedirectTo URL on this origin.
      let safeNext: string | null = null;
      if (next) {
        try {
          const u = new URL(next, window.location.origin);
          if (u.origin === window.location.origin) safeNext = u.pathname + u.search;
        } catch {
          safeNext = null;
        }
      }
      navigate(type === 'recovery' ? '/reset' : (safeNext ?? '/home'), { replace: true });
    });
  }, [params, navigate]);

  if (error) {
    return (
      <AuthLayout icon="alert" title="We couldn’t open that link" subtitle={error} back="/">
        <Spacer />
        <Button onClick={() => navigate('/login')}>Go to sign in</Button>
        <p className="text-center">
          <TextLink to="/forgot" className="inline-block px-2 py-2 text-[15px] leading-[22px]">
            Reset password instead
          </TextLink>
        </p>
      </AuthLayout>
    );
  }
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 canvas-gradient" aria-busy="true" role="status">
      <Logo height={44} tile label="" />
      <p className="type-body text-secondary">Checking your link…</p>
    </div>
  );
}
