import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Logo } from '@/components/Logo';
import { useAuth } from './AuthProvider';
import { SetupNeeded } from './SetupNeeded';

function Booting() {
  return (
    <div className="flex min-h-dvh items-center justify-center canvas-gradient" aria-busy="true" aria-label="Loading Shoppa">
      <Logo height={44} tile label="" />
    </div>
  );
}

/** App routes: signed-in users only. Logged-out visitors go to the Welcome flow, keeping where they were headed. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { session, loading, configured } = useAuth();
  const location = useLocation();
  if (!configured) return <SetupNeeded />;
  if (loading) return <Booting />;
  if (!session) return <Navigate to="/" replace state={{ from: location.pathname + location.search }} />;
  return <>{children}</>;
}

/** Auth routes: signed-in users skip straight to Home (or where they were headed). */
export function RedirectIfAuthed({ children }: { children: ReactNode }) {
  const { session, loading, configured, recovering } = useAuth();
  const location = useLocation();
  if (!configured) return <SetupNeeded />;
  if (loading) return <Booting />;
  if (session && !recovering) {
    const from = (location.state as { from?: string } | null)?.from;
    return <Navigate to={from && from !== '/' ? from : '/home'} replace />;
  }
  return <>{children}</>;
}

/** Auth-callback routes only need Supabase to be configured. */
export function RequireConfig({ children }: { children: ReactNode }) {
  const { configured } = useAuth();
  return configured ? <>{children}</> : <SetupNeeded />;
}
