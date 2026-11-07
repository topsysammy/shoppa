import { useSyncExternalStore } from 'react';

/**
 * Which sheet or dialog is open, so the + button, keyboard shortcuts and
 * pages can open the same sheets from anywhere. One at a time, plus an
 * optional child (e.g. Unit picker over Edit item) handled inside the sheet.
 */
export type SheetState =
  | { kind: 'none' }
  | { kind: 'addMenu' }
  | { kind: 'join' }
  | { kind: 'shortcuts' }
  | { kind: 'createList' }
  | { kind: 'editList'; listId: string }
  | { kind: 'renameList'; listId: string }
  | { kind: 'deleteList'; listId: string }
  | { kind: 'listOptions'; listId: string }
  | { kind: 'share'; listId: string }
  | { kind: 'pushPrompt'; reason: 'share' | 'join' }
  | { kind: 'quickAdd'; listId?: string; text?: string }
  | { kind: 'addItem'; listId: string }
  | { kind: 'editItem'; itemId: string; focus?: 'note' }
  | { kind: 'itemActions'; itemId: string }
  | { kind: 'moveItem'; itemId: string };

let state: SheetState = { kind: 'none' };
const subs = new Set<() => void>();

export function openSheet(next: SheetState) {
  state = next;
  subs.forEach((s) => s());
}
export const closeSheet = () => openSheet({ kind: 'none' });

export function useSheet(): SheetState {
  return useSyncExternalStore(
    (cb) => {
      subs.add(cb);
      return () => subs.delete(cb);
    },
    () => state,
  );
}
