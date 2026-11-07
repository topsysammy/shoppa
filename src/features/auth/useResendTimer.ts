import { useCallback, useEffect, useState } from 'react';

/** Countdown for "Resend in 0:42" (Supabase allows one email per 60s by default). */
export function useResendTimer(seconds = 60) {
  const [until, setUntil] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (until <= now) return;
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [until, now]);

  const left = Math.max(0, Math.ceil((until - now) / 1000));
  const label = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
  const start = useCallback(() => {
    const n = Date.now();
    setNow(n);
    setUntil(n + seconds * 1000);
  }, [seconds]);
  return { left, label, start };
}
