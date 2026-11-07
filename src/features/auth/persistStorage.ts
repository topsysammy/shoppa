import { isStandalone } from '@/pwa/install';
import { keys, local } from '@/lib/storage';

/**
 * W8: ask the browser for persistent storage after sign-in so lists in
 * IndexedDB are not evicted (Safari clears data for sites unused for 7 days).
 * The result is recorded so the shell can warn once when it was refused and
 * the app is not installed.
 */
export async function requestPersistentStorage(): Promise<boolean | null> {
  if (!navigator.storage?.persist) return null;
  try {
    const already = await navigator.storage.persisted();
    const granted = already || (await navigator.storage.persist());
    local.set(keys.storagePersist, granted ? 'granted' : 'refused');
    return granted;
  } catch {
    return null;
  }
}

/** W8: true when the one-time "install to keep your lists safe" warning should show. */
export function shouldWarnStorage(): boolean {
  return local.get(keys.storagePersist) === 'refused' && !isStandalone() && local.get(keys.storageWarned) !== '1';
}

export function markStorageWarned() {
  local.set(keys.storageWarned, '1');
}
