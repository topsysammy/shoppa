import { useSyncExternalStore } from 'react';

/** True when the media query matches (e.g. desktop breakpoint). */
export function useMedia(query: string): boolean {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(query);
      m.addEventListener('change', cb);
      return () => m.removeEventListener('change', cb);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** PRD section 3: desktop is 1024px and up. */
export const useIsDesktop = () => useMedia('(min-width: 1024px)');
