import { useState } from 'react';
import { appUrl, supabase } from '@/lib/supabase/client';
import { authMessage } from '@/lib/supabase/errors';

/** A2: Continue with Google (and Apple when enabled). Redirects back to Home or the page the user was headed to. */
export function useOAuth(next = '/home') {
  const [busy, setBusy] = useState<'google' | 'apple' | null>(null);
  const [error, setError] = useState('');
  const start = async (provider: 'google' | 'apple') => {
    setError('');
    setBusy(provider);
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: appUrl(next) },
    });
    if (err) {
      setError(authMessage(err));
      setBusy(null);
    }
  };
  return { busy, error, start };
}
