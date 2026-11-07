import { useSyncExternalStore } from 'react';
import type { IconName } from '@/components/icons/Icon';

export type ToastSpec = { id: number; message: string; icon?: IconName; actionLabel?: string; onAction?: () => void; ms?: number };

let toasts: ToastSpec[] = [];
let nextId = 1;
const subs = new Set<() => void>();
const emit = () => subs.forEach((s) => s());

/** Shows a toast (screens 31 and 32). Only the newest is visible; it closes after 5s. */
export function showToast(t: Omit<ToastSpec, 'id'>): number {
  const id = nextId++;
  toasts = [{ ...t, id }];
  emit();
  window.setTimeout(() => dismissToast(id), t.ms ?? 5_000);
  return id;
}

export function dismissToast(id: number) {
  const before = toasts.length;
  toasts = toasts.filter((t) => t.id !== id);
  if (toasts.length !== before) emit();
}

export function useToasts(): ToastSpec[] {
  return useSyncExternalStore(
    (cb) => {
      subs.add(cb);
      return () => subs.delete(cb);
    },
    () => toasts,
  );
}
