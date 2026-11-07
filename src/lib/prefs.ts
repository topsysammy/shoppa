import { useSyncExternalStore } from 'react';
import { local } from './storage';

/** Per-device preferences (not synced): Appearance > Readability, and analytics opt-out. */
export type DevicePrefs = { largeShopText: boolean; keepAwake: boolean; analytics: boolean };
const KEY = 'shoppa.devicePrefs';
const defaults: DevicePrefs = { largeShopText: true, keepAwake: true, analytics: true };
const subs = new Set<() => void>();
let cache: DevicePrefs | null = null;

function read(): DevicePrefs {
  if (cache) return cache;
  try {
    cache = { ...defaults, ...(JSON.parse(local.get(KEY) ?? '{}') as Partial<DevicePrefs>) };
  } catch {
    cache = defaults;
  }
  return cache;
}

export const getPrefs = read;

export function setPref<K extends keyof DevicePrefs>(key: K, value: DevicePrefs[K]) {
  cache = { ...read(), [key]: value };
  local.set(KEY, JSON.stringify(cache));
  subs.forEach((s) => s());
}

export function usePrefs(): DevicePrefs {
  return useSyncExternalStore(
    (cb) => {
      subs.add(cb);
      return () => subs.delete(cb);
    },
    read,
  );
}
