import { db } from '@/db/schema';
import { useLiveQuery } from '@/db/useLiveQuery';

export function useUnreadCount(): number {
  return useLiveQuery(async () => (await db.notifications.toArray()).filter((n) => !n.readAt).length, []) ?? 0;
}
