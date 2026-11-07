import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';
import { clearLocalData, db, getMeta, setMeta, type ActivityRow, type Entity, type NotificationRow, type ItemRow, type ListRow, type MemberRow, type OutboxOp, type ProfileRow } from '@/db/schema';
import { currentUserId } from './currentUser';

/**
 * Background sync between IndexedDB and Supabase (PRD section 7).
 *
 * Push: outbox ops are sent in order. Consecutive ops for the same row are
 * merged into one request that carries only the changed fields, so the
 * server applies last-write-wins per field on arrival (rule 1).
 * Pull: rows changed since the last cursor are fetched and written locally;
 * fields still waiting in the outbox are laid back on top so local edits are
 * never overwritten by older server data.
 * Retries (rule 4): 5s, 30s, 2 min, then every 5 min while the tab is open,
 * plus on load, `online`, focus, Background Sync and the Try again button.
 */

export type SyncState = 'idle' | 'syncing' | 'offline' | 'error';
export type SyncStatus = { state: SyncState; lastSyncedAt: number | null; error: string | null; nextRetryAt: number | null };

const RETRY_STEPS = [5_000, 30_000, 120_000];
const RETRY_STEADY = 300_000;
const PAGE = 500;

/** Rule 4 delay after the nth consecutive failure (n starts at 1). */
export function retryDelay(attempts: number): number {
  return RETRY_STEPS[attempts - 1] ?? RETRY_STEADY;
}

let status: SyncStatus = { state: 'idle', lastSyncedAt: null, error: null, nextRetryAt: null };
const listeners = new Set<() => void>();
function setStatus(next: Partial<SyncStatus>) {
  status = { ...status, ...next };
  listeners.forEach((l) => l());
}
export const getSyncStatus = () => status;
export function subscribeSync(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

let running = false;
let again = false;
let debounce: number | undefined;
let retryTimer: number | undefined;
let channel: RealtimeChannel | null = null;
let started = false;

/** Ask for a sync soon. Writes debounce briefly so a burst of ticks sends together. */
export function requestSync(reason: 'write' | 'online' | 'focus' | 'start' | 'realtime' | 'manual' | 'background' | 'retry') {
  if (!started) return;
  window.clearTimeout(debounce);
  debounce = window.setTimeout(() => void run(), reason === 'write' || reason === 'realtime' ? 400 : 0);
}

async function run() {
  if (!currentUserId()) return;
  if (!navigator.onLine) {
    setStatus({ state: 'offline' });
    return;
  }
  if (running) {
    again = true;
    return;
  }
  running = true;
  try {
    // One tab syncs at a time (rule 7); others try again shortly.
    const locks = (navigator as Navigator & { locks?: LockManager }).locks;
    if (locks) {
      const got = await locks.request('shoppa-sync', { ifAvailable: true }, async (lock) => {
        if (!lock) return false;
        await syncOnce();
        return true;
      });
      if (!got) window.setTimeout(() => requestSync('retry'), 2_000);
    } else {
      await syncOnce();
    }
  } finally {
    running = false;
    if (again) {
      again = false;
      requestSync('retry');
    }
  }
}

async function syncOnce() {
  setStatus({ state: 'syncing' });
  const pushed = await push();
  if (!pushed.ok) {
    const at = pushed.nextRetryAt;
    setStatus({ state: navigator.onLine ? 'error' : 'offline', error: pushed.error, nextRetryAt: at });
    scheduleRetry(at);
    void registerBackgroundSync();
    return;
  }
  try {
    await pull();
    setStatus({ state: 'idle', lastSyncedAt: Date.now(), error: null, nextRetryAt: null });
  } catch (e) {
    const at = Date.now() + RETRY_STEPS[0]!;
    setStatus({ state: navigator.onLine ? 'error' : 'offline', error: (e as Error).message, nextRetryAt: at });
    scheduleRetry(at);
  }
}

function scheduleRetry(at: number) {
  window.clearTimeout(retryTimer);
  retryTimer = window.setTimeout(() => requestSync('retry'), Math.max(0, at - Date.now()));
}

// Push -------------------------------------------------------------------------

type PushResult = { ok: true } | { ok: false; error: string; nextRetryAt: number };

/** PostgREST errors that will never succeed on retry. */
function isPermanent(code: string | undefined): boolean {
  return !!code && ['42501', '23514', '23503', '22P02', '23502', 'PGRST204', '42703'].includes(code);
}

async function push(): Promise<PushResult> {
  for (;;) {
    const ops = await db.outbox.orderBy('seq').limit(50).toArray();
    if (!ops.length) return { ok: true };
    const head = ops[0]!;
    if (head.nextRetryAt > Date.now()) return { ok: false, error: head.lastError ?? 'Waiting to retry', nextRetryAt: head.nextRetryAt };

    // Merge consecutive ops for the same row.
    const group: OutboxOp[] = [head];
    for (const op of ops.slice(1)) {
      if (op.entity === head.entity && op.entityId === head.entityId) group.push(op);
      else break;
    }
    const payload = Object.assign({}, ...group.map((g) => g.payload)) as Record<string, unknown>;
    const seqs = group.map((g) => g.seq!);

    let error: { code?: string; message: string } | null = null;
    try {
      if (head.op === 'insert') {
        const res = await supabase.from(head.entity).insert(payload);
        error = res.error;
        if (error?.code === '23505' && head.entity === 'activity') {
          error = null; // append-only row already stored by an earlier attempt
        } else if (error?.code === '23505') {
          // Already created by an earlier attempt whose reply was lost: apply as an update.
          const { id: _id, owner_id: _o, created_by: _c, created_at: _t, ...rest } = payload;
          const upd = await supabase.from(head.entity).update(rest).eq('id', head.entityId);
          error = upd.error;
        }
      } else {
        const idCol = head.entity === 'notification_settings' ? 'user_id' : 'id';
        const res = await supabase.from(head.entity).update(payload).eq(idCol, head.entityId);
        error = res.error;
      }
    } catch (e) {
      error = { message: (e as Error).message || 'Network error' };
    }

    if (!error) {
      await db.outbox.bulkDelete(seqs);
      continue;
    }

    if (isPermanent(error.code)) {
      // Drop the change and restore the server's copy on the next pull.
      await db.outbox.bulkDelete(seqs);
      await setMeta('sync.lastRejected', JSON.stringify({ entity: head.entity, id: head.entityId, code: error.code, at: Date.now() }));
      await refetchRow(head.entity, head.entityId);
      continue;
    }

    const attempts = head.attempts + 1;
    const nextRetryAt = Date.now() + retryDelay(attempts);
    await db.outbox.update(head.seq!, { attempts, nextRetryAt, lastError: error.message });
    return { ok: false, error: error.message, nextRetryAt };
  }
}

async function refetchRow(entity: Entity, id: string) {
  if (entity === 'profiles' || entity === 'notification_settings') return;
  const { data } = await supabase.from(entity).select('*').eq('id', id).maybeSingle();
  if (data) await applyRows(entity, [data]);
  else if (entity === 'lists') await db.lists.delete(id);
  else if (entity === 'items') await db.items.delete(id);
  else if (entity === 'activity') await db.activity.delete(id);
  else if (entity === 'notifications') await db.notifications.delete(id);
  // profiles / settings: the next pull restores the server copy
}

// Pull -------------------------------------------------------------------------

type ServerRow = Record<string, unknown> & { updated_at: string };

function listFromServer(r: Record<string, unknown>): ListRow {
  return {
    id: r.id as string,
    ownerId: r.owner_id as string,
    title: r.title as string,
    note: (r.note as string) ?? '',
    kind: r.kind as ListRow['kind'],
    icon: r.icon as ListRow['icon'],
    archivedAt: (r.archived_at as string) ?? null,
    deletedAt: (r.deleted_at as string) ?? null,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  };
}

function itemFromServer(r: Record<string, unknown>): ItemRow {
  return {
    id: r.id as string,
    listId: r.list_id as string,
    name: r.name as string,
    quantity: r.quantity == null ? null : Number(r.quantity),
    unit: (r.unit as string) ?? null,
    note: (r.note as string) ?? '',
    purchasedAt: (r.purchased_at as string) ?? null,
    purchasedBy: (r.purchased_by as string) ?? null,
    position: Number(r.position ?? 0),
    createdBy: (r.created_by as string) ?? null,
    deletedAt: (r.deleted_at as string) ?? null,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  };
}

function activityFromServer(r: Record<string, unknown>): ActivityRow {
  return {
    id: r.id as string,
    listId: r.list_id as string,
    actorId: (r.actor_id as string) ?? null,
    type: r.type as string,
    payload: (r.payload as Record<string, unknown>) ?? {},
    createdAt: r.created_at as string,
  };
}

function notificationFromServer(r: Record<string, unknown>): NotificationRow {
  return {
    id: r.id as string,
    listId: (r.list_id as string) ?? null,
    actorId: (r.actor_id as string) ?? null,
    type: r.type as NotificationRow['type'],
    count: Number(r.count ?? 1),
    payload: (r.payload as Record<string, unknown>) ?? {},
    readAt: (r.read_at as string) ?? null,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  };
}

const serverToLocal: Record<Entity, Record<string, string>> = {
  activity: {},
  notifications: { read_at: 'readAt' },
  profiles: {},
  notification_settings: {},
  lists: { title: 'title', note: 'note', kind: 'kind', icon: 'icon', archived_at: 'archivedAt', deleted_at: 'deletedAt' },
  items: {
    list_id: 'listId',
    name: 'name',
    quantity: 'quantity',
    unit: 'unit',
    note: 'note',
    purchased_at: 'purchasedAt',
    position: 'position',
    deleted_at: 'deletedAt',
  },
};

async function applyRows(entity: Entity, rows: Record<string, unknown>[]) {
  if (!rows.length) return;
  const ids = rows.map((r) => r.id as string);
  const pending = await db.outbox.where('entityId').anyOf(ids).toArray();
  const pendingById = new Map<string, Record<string, unknown>>();
  for (const op of pending.sort((a, b) => a.seq! - b.seq!)) {
    pendingById.set(op.entityId, { ...(pendingById.get(op.entityId) ?? {}), ...op.payload });
  }
  const overlay = (local: Record<string, unknown>, id: string) => {
    const p = pendingById.get(id);
    if (!p) return local;
    const map = serverToLocal[entity];
    for (const [col, v] of Object.entries(p)) {
      const key = map[col];
      if (key) local[key] = col === 'quantity' && v != null ? Number(v) : v;
    }
    return local;
  };
  if (entity === 'activity') {
    await db.activity.bulkPut(rows.map(activityFromServer));
  } else if (entity === 'notifications') {
    await db.notifications.bulkPut(rows.map((r) => overlay(notificationFromServer(r), r.id as string) as NotificationRow));
  } else if (entity === 'lists') {
    await db.lists.bulkPut(rows.map((r) => overlay(listFromServer(r), r.id as string) as ListRow));
  } else {
    await db.items.bulkPut(rows.map((r) => overlay(itemFromServer(r), r.id as string) as ItemRow));
  }
}

async function pullTable(table: 'lists' | 'items' | 'activity' | 'notifications') {
  const key = `cursor:${table}`;
  for (;;) {
    const raw = await getMeta(key);
    const cursor = raw ? (JSON.parse(raw) as { at: string; id: string }) : null;
    const idCol = 'id';
    let q = supabase.from(table).select('*').order('updated_at').order(idCol).limit(PAGE);
    if (cursor) q = q.or(`updated_at.gt.${cursor.at},and(updated_at.eq.${cursor.at},${idCol}.gt.${cursor.id})`);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as ServerRow[];
    await applyRows(table, rows);
    const last = rows[rows.length - 1];
    if (last) await setMeta(key, JSON.stringify({ at: last.updated_at, id: last[idCol] }));
    if (rows.length < PAGE) return;
  }
}

/** Own profile in full, co-members' name and avatar tone (phase 5 RLS). */
async function pullProfiles() {
  const id = currentUserId();
  if (!id) return;
  const { data, error } = await supabase.from('profiles').select('id, display_name, avatar_tone, default_list_id, unit_system, theme, unit_prefs');
  if (error) throw new Error(error.message);
  const pending = await db.outbox.where('entityId').equals(id).toArray();
  const pendingProfile = Object.assign({}, ...pending.filter((o) => o.entity === 'profiles').map((o) => o.payload)) as Record<string, unknown>;
  const rows: ProfileRow[] = (data ?? []).map((p) => {
    const merged = p.id === id ? { ...p, ...pendingProfile } : p;
    return {
      id: merged.id,
      displayName: merged.display_name,
      avatarTone: merged.avatar_tone,
      defaultListId: merged.default_list_id,
      unitSystem: merged.unit_system,
      theme: merged.theme,
      unitPrefs: merged.unit_prefs ?? undefined,
    };
  });
  await db.profiles.bulkPut(rows);

  // Screen 56 settings; local edits waiting in the outbox win.
  if (!pending.some((o) => o.entity === 'notification_settings')) {
    const { data: st } = await supabase.from('notification_settings').select('*').eq('user_id', id).maybeSingle();
    if (st) {
      await setMeta(
        'notificationSettings',
        JSON.stringify({
          pushEnabled: st.push_enabled,
          invitations: st.invitations,
          listActivity: st.list_activity,
          shoppingUpdates: st.shopping_updates,
          reminders: st.reminders,
          remindDay: st.remind_day,
          remindTime: String(st.remind_time).slice(0, 5),
        }),
      );
    }
  }
}

/**
 * Members are small, so they are fetched in full and replaced. This also
 * catches removals: lists the user is no longer a member of are removed
 * from the device (unless they were created here and haven't synced yet).
 */
async function pullMembers() {
  const me = currentUserId();
  if (!me) return;
  const { data, error } = await supabase.from('list_members').select('list_id, user_id, role, joined_at');
  if (error) throw new Error(error.message);
  const rows: MemberRow[] = (data ?? []).map((r) => ({
    key: `${r.list_id}:${r.user_id}`,
    listId: r.list_id,
    userId: r.user_id,
    role: r.role,
    joinedAt: r.joined_at,
  }));
  const mine = new Set(rows.filter((r) => r.userId === me).map((r) => r.listId));
  const pendingLists = new Set((await db.outbox.where('entityId').anyOf(await db.lists.toCollection().primaryKeys()).toArray()).filter((o) => o.entity === 'lists' && o.op === 'insert').map((o) => o.entityId));
  const gone = (await db.lists.toArray()).filter((l) => !mine.has(l.id) && !pendingLists.has(l.id)).map((l) => l.id);
  // Lists joined since the last pull are older than the cursors: fetch them in full.
  const localIds = new Set(await db.lists.toCollection().primaryKeys());
  const joined = [...mine].filter((id) => !localIds.has(id));
  if (joined.length) {
    const [lists, items, activity] = await Promise.all([
      supabase.from('lists').select('*').in('id', joined),
      supabase.from('items').select('*').in('list_id', joined),
      supabase.from('activity').select('*').in('list_id', joined).order('created_at', { ascending: false }).limit(500),
    ]);
    const err = lists.error ?? items.error ?? activity.error;
    if (err) throw new Error(err.message);
    await applyRows('lists', lists.data ?? []);
    await applyRows('items', items.data ?? []);
    await applyRows('activity', activity.data ?? []);
  }
  await db.transaction('rw', [db.members, db.lists, db.items, db.activity], async () => {
    const keepLocal = (await db.members.toArray()).filter((m) => pendingLists.has(m.listId));
    await db.members.clear();
    await db.members.bulkPut([...rows, ...keepLocal]);
    if (gone.length) {
      await db.lists.bulkDelete(gone);
      await db.items.where('listId').anyOf(gone).delete();
      await db.activity.where('listId').anyOf(gone).delete();
    }
  });
}

async function pull() {
  await pullTable('lists');
  await pullMembers();
  await pullTable('items');
  await pullTable('activity');
  await pullTable('notifications');
  await pullProfiles();
}

// Lifecycle --------------------------------------------------------------------

const onOnline = () => requestSync('online');
const onOffline = () => setStatus({ state: 'offline' });
const onFocus = () => requestSync('focus');
const onVisible = () => document.visibilityState === 'visible' && requestSync('focus');
const onSwMessage = (e: MessageEvent) => {
  if ((e.data as { type?: string } | null)?.type === 'shoppa:sync') requestSync('background');
};

async function registerBackgroundSync() {
  try {
    const reg = await navigator.serviceWorker?.ready;
    const sync = (reg as ServiceWorkerRegistration & { sync?: { register: (tag: string) => Promise<void> } } | undefined)?.sync;
    await sync?.register('shoppa-outbox');
  } catch {
    /* Background Sync unsupported (Safari, Firefox): retries run while the tab is open */
  }
}

/** Called by AuthProvider when a user signs in (or a stored session loads). */
export async function startSync(userId: string) {
  // A different user on this browser: never mix their data.
  const owner = await getMeta('userId');
  if (owner && owner !== userId) await clearLocalData();
  await setMeta('userId', userId);
  if (started) return;
  started = true;
  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);
  window.addEventListener('focus', onFocus);
  document.addEventListener('visibilitychange', onVisible);
  navigator.serviceWorker?.addEventListener('message', onSwMessage);
  // Rule 6: live updates while the tab is open.
  channel = supabase
    .channel('shoppa-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'lists' }, () => requestSync('realtime'))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'items' }, () => requestSync('realtime'))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'list_members' }, () => requestSync('realtime'))
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activity' }, () => requestSync('realtime'))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => requestSync('realtime'))
    .subscribe();
  requestSync('start');
}

export function stopSync() {
  started = false;
  window.clearTimeout(debounce);
  window.clearTimeout(retryTimer);
  window.removeEventListener('online', onOnline);
  window.removeEventListener('offline', onOffline);
  window.removeEventListener('focus', onFocus);
  document.removeEventListener('visibilitychange', onVisible);
  navigator.serviceWorker?.removeEventListener('message', onSwMessage);
  if (channel) void supabase.removeChannel(channel);
  channel = null;
  setStatus({ state: 'idle', error: null, nextRetryAt: null });
}

/** Manual "Try again" on the sync banner: clears the backoff and syncs now. */
export async function retryNow() {
  await db.outbox.toCollection().modify({ nextRetryAt: 0 });
  requestSync('manual');
}

/** Best-effort push before sign-out so queued changes are not lost. */
export async function flushBeforeSignOut(timeoutMs = 4_000): Promise<number> {
  if (navigator.onLine) {
    await Promise.race([push(), new Promise((r) => window.setTimeout(r, timeoutMs))]);
  }
  return db.outbox.count();
}
