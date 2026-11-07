import { useSyncExternalStore } from 'react';
import { local } from '@/lib/storage';

/** Invites the user opened and answered "Not now" to (shown on the Shared tab, screen 42). */
export type PendingInvite = { token: string; title: string; inviter: string; itemCount: number; savedAt: number };

const KEY = 'shoppa.pendingInvites';
const subs = new Set<() => void>();
let cache: PendingInvite[] | null = null;

function read(): PendingInvite[] {
  if (cache) return cache;
  try {
    cache = JSON.parse(local.get(KEY) ?? '[]') as PendingInvite[];
  } catch {
    cache = [];
  }
  return cache;
}

function write(next: PendingInvite[]) {
  cache = next;
  local.set(KEY, JSON.stringify(next));
  subs.forEach((s) => s());
}

export const savePendingInvite = (inv: Omit<PendingInvite, 'savedAt'>) =>
  write([{ ...inv, savedAt: Date.now() }, ...read().filter((i) => i.token !== inv.token)].slice(0, 10));
export const removePendingInvite = (token: string) => write(read().filter((i) => i.token !== token));

export function usePendingInvites(): PendingInvite[] {
  return useSyncExternalStore(
    (cb) => {
      subs.add(cb);
      return () => subs.delete(cb);
    },
    read,
  );
}
