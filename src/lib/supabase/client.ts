import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/** False until .env.local has the project URL and anon key. */
export const supabaseConfigured = Boolean(url && anonKey);

/**
 * Browser Supabase client. Only the public anon key is used here (PRD section 8);
 * every table is protected by row-level security.
 * A8: the session (with its refresh token) is kept in localStorage, so it
 * survives closing the tab and works offline until the user logs out.
 */
export const supabase = createClient(url ?? 'http://localhost:54321', anonKey ?? 'not-configured', {
  auth: {
    flowType: 'pkce',
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'shoppa.auth',
  },
});

/** Absolute URL on this origin, used for auth redirects. */
export const appUrl = (path: string) => new URL(path, window.location.origin).toString();
