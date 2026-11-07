import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/Button';
import { supabase } from '@/lib/supabase/client';
import { authMessage } from '@/lib/supabase/errors';
import { useOnline } from '@/lib/useOnline';
import { useAuth } from './AuthProvider';
import { AuthLayout, FormError, OfflineNote, PasswordChecklist, PasswordInput, passwordRules, Spacer, TextLink } from './ui';

/**
 * Screen 10 Set a new password. Reached from the reset email via
 * /auth/confirm, which signs the user in with a recovery session.
 */
export function ResetPassword() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const online = useOnline();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const rules = passwordRules(password, confirm);

  if (!loading && !session) {
    return (
      <AuthLayout icon="clock" title="This link has expired" subtitle="Reset links work once and expire after 30 minutes." back="/login">
        <Spacer />
        <Button onClick={() => navigate('/forgot')}>Send a new link</Button>
        <p className="text-center">
          <TextLink to="/login" className="inline-block px-2 py-2 text-[15px] leading-[22px]">
            Back to sign in
          </TextLink>
        </p>
      </AuthLayout>
    );
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!rules.length || !rules.number || !rules.match) return setError('Check the requirements below.');
    setBusy(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (err) return setError(authMessage(err));
    navigate('/home', { replace: true });
  };

  return (
    <AuthLayout title="Set a new password" subtitle="Choose something you haven’t used before." back={false}>
      <form noValidate onSubmit={submit} className="flex flex-1 flex-col gap-4">
        <PasswordInput label="New password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <PasswordInput label="Re-enter password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        <PasswordChecklist password={password} confirm={confirm} />
        <FormError message={error} />
        <OfflineNote />
        <Spacer />
        <Button type="submit" loading={busy} disabled={!online}>
          Update password
        </Button>
      </form>
    </AuthLayout>
  );
}
