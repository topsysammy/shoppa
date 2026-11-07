import { useState, type FormEvent } from 'react';
import { useLocation } from 'react-router-dom';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { supabase } from '@/lib/supabase/client';
import { authMessage } from '@/lib/supabase/errors';
import { useOnline } from '@/lib/useOnline';
import { useOAuth } from './oauth';
import { appleEnabled, AuthLayout, FormError, OfflineNote, OrDivider, PasswordInput, SocialButton, Spacer, TextLink } from './ui';

/** Screen 07 Log in. Wrong credentials show on the password field, as in Figma. */
export function LogIn() {
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;
  const online = useOnline();
  const oauth = useOAuth(from ?? '/home');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [fieldError, setFieldError] = useState('');
  const [error, setError] = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setFieldError('');
    setError('');
    if (!email.trim() || !password) return setFieldError('Enter your email and password.');
    setBusy(true);
    const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (!err) return; // RedirectIfAuthed sends the user on once the session lands.
    if (err.code === 'invalid_credentials') return setFieldError(authMessage(err));
    setError(authMessage(err));
  };

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to pick up your lists." back="/">
      <form onSubmit={submit} noValidate className="flex flex-1 flex-col gap-4">
        <Input
          label="Email address"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@email.com"
        />
        <PasswordInput
          label="Password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={fieldError || undefined}
        />
        <div className="-mt-1 flex justify-end">
          <TextLink to="/forgot" state={{ email }} className="px-1 py-2 text-[14px] leading-5">
            Forgot password?
          </TextLink>
        </div>
        <FormError message={error || oauth.error} />
        <OfflineNote />
        <Button type="submit" loading={busy} disabled={!online}>
          Sign in
        </Button>
        <OrDivider label="Or sign in with" />
        <div className="flex gap-2.5">
          <SocialButton compact provider="google" label="Google" onClick={() => oauth.start('google')} busy={oauth.busy === 'google'} disabled={!online} />
          {appleEnabled ? (
            <SocialButton compact provider="apple" label="Apple" onClick={() => oauth.start('apple')} busy={oauth.busy === 'apple'} disabled={!online} />
          ) : null}
        </div>
        <Spacer />
        <p className="text-center text-[14px] leading-5 text-secondary">
          New to Shoppa?{' '}
          <TextLink to="/signup" state={location.state}>
            Create an account
          </TextLink>
        </p>
      </form>
    </AuthLayout>
  );
}
