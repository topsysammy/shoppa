import { useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { appUrl, supabase } from '@/lib/supabase/client';
import { authMessage } from '@/lib/supabase/errors';
import { keys, session } from '@/lib/storage';
import { useOnline } from '@/lib/useOnline';
import { useOAuth } from './oauth';
import {
  appleEnabled,
  AuthLayout,
  FormError,
  LegalNote,
  OfflineNote,
  OrDivider,
  PasswordInput,
  passwordRules,
  SocialButton,
  Spacer,
  TextLink,
} from './ui';

const emailOk = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

/** Screen 06 Sign up: full name, email, password (8+ characters with a number). */
export function SignUp() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;
  const online = useOnline();
  const oauth = useOAuth(from ?? '/home');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const rules = passwordRules(password);
  const errors = {
    name: touched && !name.trim() ? 'Tell us your name.' : undefined,
    email: touched && !emailOk(email) ? 'Enter a valid email address.' : undefined,
    password: touched && !(rules.length && rules.number) ? 'At least 8 characters, with a number.' : undefined,
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    setError('');
    if (!name.trim() || !emailOk(email) || !rules.length || !rules.number) return;
    setBusy(true);
    const { data, error: err } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { display_name: name.trim() },
        // A7: the emailed link opens the web app and lands on Home.
        emailRedirectTo: appUrl(from ?? '/home'),
      },
    });
    setBusy(false);
    if (err) return setError(authMessage(err));
    // Supabase returns a user with no identities when the email is already registered.
    if (data.user && data.user.identities?.length === 0) {
      return setError('An account with this email already exists. Try signing in.');
    }
    session.set(keys.pendingEmail, email.trim());
    if (data.session) navigate('/verify?done=1', { replace: true, state: location.state });
    else navigate('/verify', { state: { ...(location.state as object), email: email.trim() } });
  };

  return (
    <AuthLayout title="Create new account" subtitle="Please enter your details." back="/">
      <form onSubmit={submit} noValidate className="flex flex-1 flex-col gap-4">
        <Input label="Full name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} placeholder="Temitope Samuel" />
        <Input
          label="Email address"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
          placeholder="you@email.com"
        />
        <PasswordInput
          label="Password"
          autoComplete="new-password"
          placeholder="Enter password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          helper="At least 8 characters, with a number."
          error={errors.password}
        />
        <FormError message={error || oauth.error} />
        <OfflineNote />
        <Button type="submit" loading={busy} disabled={!online}>
          Sign up
        </Button>
        <OrDivider label="Or sign up with" />
        <div className="flex gap-2.5">
          <SocialButton compact provider="google" label="Google" onClick={() => oauth.start('google')} busy={oauth.busy === 'google'} disabled={!online} />
          {appleEnabled ? (
            <SocialButton compact provider="apple" label="Apple" onClick={() => oauth.start('apple')} busy={oauth.busy === 'apple'} disabled={!online} />
          ) : null}
        </div>
        <Spacer />
        <LegalNote />
        <p className="text-center text-[14px] leading-5 text-secondary">
          Already have an account?{' '}
          <TextLink to="/login" state={location.state}>
            Sign in
          </TextLink>
        </p>
      </form>
    </AuthLayout>
  );
}
