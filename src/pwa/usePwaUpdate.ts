import { useRegisterSW } from 'virtual:pwa-register/react';

/**
 * W4: a new service worker waits until the user taps Reload in the Update
 * available toast. Unsynced writes live in IndexedDB (phase 3), so reloading
 * never loses them. If the user ignores the toast, the new version activates
 * on the next cold start.
 */
export function usePwaUpdate() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, reg) {
      // Check for a new version every hour while the tab stays open.
      if (reg) setInterval(() => void reg.update(), 60 * 60 * 1000);
    },
  });
  return {
    needRefresh,
    offlineReady,
    reload: () => updateServiceWorker(true),
    dismiss: () => {
      setNeedRefresh(false);
      setOfflineReady(false);
    },
  };
}
