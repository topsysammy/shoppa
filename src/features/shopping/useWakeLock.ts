import { useEffect, useState } from 'react';

export type WakeLockState = 'pending' | 'on' | 'unsupported' | 'denied';

type Sentinel = { released: boolean; release: () => Promise<void>; addEventListener: (t: 'release', cb: () => void) => void };
type WakeLockApi = { request: (type: 'screen') => Promise<Sentinel> };

/**
 * S1: keep the screen awake in Shopping Mode with the Screen Wake Lock API,
 * and request it again whenever the tab becomes visible (the browser drops
 * the lock when the tab is hidden). Unsupported browsers get a tip instead.
 */
export function useWakeLock(active: boolean): WakeLockState {
  const api = (navigator as Navigator & { wakeLock?: WakeLockApi }).wakeLock;
  const [state, setState] = useState<WakeLockState>(api ? 'pending' : 'unsupported');

  useEffect(() => {
    if (!active || !api) return;
    let sentinel: Sentinel | null = null;
    let cancelled = false;

    const acquire = async () => {
      if (document.visibilityState !== 'visible' || (sentinel && !sentinel.released)) return;
      try {
        sentinel = await api.request('screen');
        if (cancelled) {
          void sentinel.release();
          return;
        }
        setState('on');
        sentinel.addEventListener('release', () => !cancelled && setState('pending'));
      } catch {
        // Low battery mode, permissions policy or not focused.
        if (!cancelled) setState('denied');
      }
    };
    const onVisible = () => void acquire();

    void acquire();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
      void sentinel?.release();
    };
  }, [active, api]);

  return state;
}
