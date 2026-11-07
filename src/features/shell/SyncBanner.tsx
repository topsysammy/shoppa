import { useSyncExternalStore } from 'react';
import { MessageCard } from '@/components/MessageCard';
import { db } from '@/db/schema';
import { useLiveQuery } from '@/db/useLiveQuery';
import { getSyncStatus, retryNow, subscribeSync } from '@/sync/engine';

/**
 * Minimal offline / sync-failed notice (PRD principle 3: offline is a normal
 * state, not an error). Screens 66 and 67 get their full design in phase 8.
 */
export function SyncBanner() {
  const status = useSyncExternalStore(subscribeSync, getSyncStatus);
  const pending = useLiveQuery(() => db.outbox.count(), []) ?? 0;
  if (status.state === 'offline') {
    return (
      <div className="px-5 pt-3">
        <MessageCard
          icon="wifi-off"
          title="You’re offline"
          body={pending ? `${pending} ${pending === 1 ? 'change' : 'changes'} saved on this phone. They’ll sync when you’re back online.` : 'Your lists still work. Changes sync when you’re back online.'}
        />
      </div>
    );
  }
  if (status.state === 'error' && pending) {
    return (
      <div className="px-5 pt-3">
        <MessageCard
          icon="alert"
          title="Couldn’t sync yet"
          body={`${pending} ${pending === 1 ? 'change is' : 'changes are'} safe on this device. We’ll keep trying.`}
          action={
            <button type="button" onClick={() => void retryNow()} className="focus-ring min-h-11 shrink-0 rounded-12 px-3 type-label hover:bg-white/10">
              Try again
            </button>
          }
        />
      </div>
    );
  }
  return null;
}
