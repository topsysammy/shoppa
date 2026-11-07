import { liveQuery } from 'dexie';
import { useEffect, useState, type DependencyList } from 'react';

/**
 * Subscribes a component to a Dexie query. Re-runs when the queried tables
 * change in this tab or any other tab (no dexie-react-hooks dependency).
 * Returns undefined until the first result arrives.
 */
export function useLiveQuery<T>(query: () => Promise<T> | T, deps: DependencyList): T | undefined {
  const [value, setValue] = useState<T | undefined>(undefined);
  useEffect(() => {
    const sub = liveQuery(query).subscribe({
      next: (v) => setValue(() => v),
      error: (e) => console.error('liveQuery failed', e),
    });
    return () => sub.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return value;
}
