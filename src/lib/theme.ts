import { useCallback, useEffect, useState } from 'react';

export type ThemePref = 'light' | 'dark' | 'system';
const KEY = 'shoppa.theme';

function read(): ThemePref {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'light' || v === 'dark' ? v : 'system';
  } catch {
    return 'system';
  }
}

/** Applies a theme preference to <html data-theme>. "system" removes the attribute. */
export function applyTheme(pref: ThemePref) {
  const root = document.documentElement;
  if (pref === 'system') delete root.dataset.theme;
  else root.dataset.theme = pref;
  try {
    if (pref === 'system') localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, pref);
  } catch {
    /* storage blocked: theme still applies for this session */
  }
}

/** Appearance setting (light, dark, system). Synced to the Profile in phase 7. */
export function useTheme() {
  const [pref, setPref] = useState<ThemePref>(read);
  useEffect(() => applyTheme(pref), [pref]);
  const set = useCallback((p: ThemePref) => setPref(p), []);
  return [pref, set] as const;
}
