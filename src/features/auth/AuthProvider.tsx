import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, supabaseConfigured } from '@/lib/supabase/client';
import { requestPersistentStorage } from './persistStorage';
import { setCurrentUserId } from '@/sync/currentUser';
import { flushBeforeSignOut, startSync, stopSync } from '@/sync/engine';
import { clearLocalData } from '@/db/schema';

type AuthState = {
  session: Session | null;
  user: User | null;
  /** True until the stored session (or an auth code in the URL) has been read. */
  loading: boolean;
  /** Set after the user opens a password-reset link (screen 10). */
  recovering: boolean;
  configured: boolean;
  displayName: string;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? '';
}

function nameOf(user: User | null): string {
  const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;
  const n = meta.display_name ?? meta.full_name ?? meta.name;
  if (typeof n === 'string' && n.trim()) return n.trim();
  return user?.email?.split('@')[0] ?? '';
}

/**
 * A8: the session persists in the browser until log out. supabase-js keeps
 * it in localStorage and refreshes tokens in the background; when offline
 * the stored session is still used, so the app opens without a network.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(supabaseConfigured);
  const [recovering, setRecovering] = useState(false);

  useEffect(() => {
    if (!supabaseConfigured) return;
    let alive = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      setSession(data.session);
      setLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next);
      if (event === 'PASSWORD_RECOVERY') setRecovering(true);
      if (event === 'SIGNED_OUT') setRecovering(false);
      // W8: ask for persistent storage once a user is signed in.
      if (event === 'SIGNED_IN') void requestPersistentStorage();
    });
    return () => {
      alive = false;
      data.subscription.unsubscribe();
    };
  }, []);

  // Start background sync for the signed-in user (PRD section 7).
  const userId = session?.user.id ?? null;
  useEffect(() => {
    setCurrentUserId(userId);
    if (userId) void startSync(userId);
    else stopSync();
  }, [userId]);

  const value = useMemo<AuthState>(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      recovering,
      configured: supabaseConfigured,
      displayName: nameOf(session?.user ?? null),
      signOut: async () => {
        // Push queued changes first, then remove this user's data from the device.
        await flushBeforeSignOut();
        // Stop push to this browser for this account.
        await (await import('@/features/notifications/push')).disablePush();
        await supabase.auth.signOut();
        await clearLocalData();
      },
    }),
    [session, loading, recovering],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
