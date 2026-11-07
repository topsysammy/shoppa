import { db, type ItemRow, type ListRow, type MemberRow, type ProfileRow } from '@/db/schema';
import { useLiveQuery } from '@/db/useLiveQuery';
import type { BadgeTone } from '@/components/Badge';
import { currentUserId } from '@/sync/currentUser';

export type ListStats = { total: number; purchased: number; remaining: number; notes: number };

export function statsOf(items: ItemRow[]): ListStats {
  const live = items.filter((i) => !i.deletedAt);
  const purchased = live.filter((i) => i.purchasedAt).length;
  return { total: live.length, purchased, remaining: live.length - purchased, notes: live.filter((i) => i.note).length };
}

/** Badge rules (Figma Badge description): Info = items left, Alert = not started, Done = complete. */
export function statusOf(s: ListStats): { label: string; tone: BadgeTone } {
  if (s.total === 0) return { label: 'Empty', tone: 'neutral' };
  if (s.purchased === s.total) return { label: 'Done', tone: 'done' };
  if (s.purchased === 0) return { label: 'Not started', tone: 'alert' };
  if (s.remaining <= 2) return { label: 'Almost done', tone: 'done' };
  return { label: `${s.remaining} left`, tone: 'info' };
}

export type ListSummary = { list: ListRow; stats: ListStats; members: MemberRow[] };

/** All lists the user can see, newest activity first, with item stats. */
export function useListSummaries(): ListSummary[] | undefined {
  return useLiveQuery(async () => {
    const [lists, items, members] = await Promise.all([db.lists.toArray(), db.items.toArray(), db.members.toArray()]);
    const byList = new Map<string, ItemRow[]>();
    for (const i of items) byList.set(i.listId, [...(byList.get(i.listId) ?? []), i]);
    const lastActivity = (l: ListRow) =>
      (byList.get(l.id) ?? []).reduce((m, i) => (i.updatedAt > m ? i.updatedAt : m), l.updatedAt);
    return lists
      .filter((l) => !l.deletedAt && !l.archivedAt)
      .map((list) => ({
        list,
        stats: statsOf(byList.get(list.id) ?? []),
        members: members.filter((m) => m.listId === list.id),
      }))
      .sort((a, b) => (lastActivity(b.list) > lastActivity(a.list) ? 1 : -1));
  }, []);
}

export function useList(id: string | undefined) {
  return useLiveQuery(async () => (id ? ((await db.lists.get(id)) ?? null) : null), [id]);
}

export function useItems(listId: string | undefined): ItemRow[] | undefined {
  return useLiveQuery(
    async () => (listId ? (await db.items.where('listId').equals(listId).toArray()).filter((i) => !i.deletedAt) : []),
    [listId],
  );
}

export function useItem(id: string | null | undefined) {
  return useLiveQuery(async () => (id ? ((await db.items.get(id)) ?? null) : null), [id]);
}

export function useMyProfile(): ProfileRow | null | undefined {
  return useLiveQuery(async () => {
    const id = currentUserId();
    return id ? ((await db.profiles.get(id)) ?? null) : null;
  }, [currentUserId()]);
}

/** Recently used item names across all lists, newest first, with their last quantity (screen 15). */
export function useRecentItems(limit = 50) {
  return useLiveQuery(async () => {
    const items = await db.items.orderBy('createdAt').reverse().limit(400).toArray();
    const seen = new Map<string, ItemRow>();
    for (const i of items) {
      const key = i.name.trim().toLowerCase();
      if (!seen.has(key)) seen.set(key, i);
      if (seen.size >= limit) break;
    }
    return [...seen.values()];
  }, [limit]);
}

/** Default list for "Add an item" (screen 16): profile setting, else the most recently active list. */
export function pickDefaultList(summaries: ListSummary[] | undefined, profile: ProfileRow | null | undefined) {
  if (!summaries?.length) return null;
  return summaries.find((s) => s.list.id === profile?.defaultListId)?.list ?? summaries[0]!.list;
}

export const isCompleted = (s: ListStats) => s.total > 0 && s.purchased === s.total;
