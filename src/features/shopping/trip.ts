import { db, getMeta, setMeta } from '@/db/schema';
import { useLiveQuery } from '@/db/useLiveQuery';
import { logActivity } from '@/db/repo';
import { currentUserId } from '@/sync/currentUser';

/** A trip left open longer than this is treated as abandoned. */
const STALE_MS = 6 * 60 * 60 * 1000;
/** Other members' trips show as live (screen 37) for this long without activity. */
const LIVE_MS = 3 * 60 * 60 * 1000;

type Trip = { startedAt: string };

const key = (listId: string) => `trip:${listId}`;

export async function getTrip(listId: string): Promise<Trip | null> {
  const raw = await getMeta(key(listId));
  if (!raw) return null;
  const trip = JSON.parse(raw) as Trip;
  return Date.now() - new Date(trip.startedAt).getTime() > STALE_MS ? null : trip;
}

/** Called when Shopping Mode opens. Logs trip_started once per trip (works offline). */
export async function startTrip(listId: string): Promise<Trip> {
  const existing = await getTrip(listId);
  if (existing) return existing;
  const trip = { startedAt: new Date().toISOString() };
  await setMeta(key(listId), JSON.stringify(trip));
  await logActivity(listId, 'trip_started', { startedAt: trip.startedAt });
  return trip;
}

export type TripSummary = { bought: number; total: number; minutes: number; early: boolean };

/** Trip summary for screen 36, and trip_finished for other members. */
export async function finishTrip(listId: string, bought: number, total: number): Promise<TripSummary> {
  const trip = (await getTrip(listId)) ?? { startedAt: new Date().toISOString() };
  const minutes = Math.max(1, Math.round((Date.now() - new Date(trip.startedAt).getTime()) / 60_000));
  const summary = { bought, total, minutes, early: bought < total };
  await db.meta.delete(key(listId));
  await logActivity(listId, 'trip_finished', { startedAt: trip.startedAt, finishedAt: new Date().toISOString(), ...summary });
  return summary;
}

export type LiveTrip = { actorId: string; startedAt: string };

/** Screen 37: someone else is shopping this list right now. */
export function useLiveTripByOthers(listId: string | undefined): LiveTrip | null | undefined {
  return useLiveQuery(async () => {
    if (!listId) return null;
    const me = currentUserId();
    const rows = (await db.activity.where('listId').equals(listId).toArray()).sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
    const open = new Map<string, string>();
    for (const r of rows) {
      if (!r.actorId || r.actorId === me) continue;
      const startedAt = (r.payload.startedAt as string | undefined) ?? r.createdAt;
      if (r.type === 'trip_started') open.set(r.actorId, startedAt);
      if (r.type === 'trip_finished') open.delete(r.actorId);
    }
    const live = [...open.entries()]
      .map(([actorId, startedAt]) => ({ actorId, startedAt }))
      .filter((t) => Date.now() - new Date(t.startedAt).getTime() < LIVE_MS)
      .sort((a, b) => (a.startedAt > b.startedAt ? -1 : 1));
    return live[0] ?? null;
  }, [listId]);
}
