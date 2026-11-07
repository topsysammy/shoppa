import { db, getMeta, setMeta, type ActivityType, type Entity, type ItemRow, type ListIcon, type ListKind, type ListRow, type NotificationSettings, type ProfileRow } from './schema';
import { currentUserId } from '@/sync/currentUser';
import { requestSync } from '@/sync/engine';

/**
 * Non-negotiable 1 (offline-first): every write goes to IndexedDB and the
 * outbox in one transaction, then sync runs in the background. Nothing in
 * this file waits on the network.
 */

const now = () => new Date().toISOString();
const uuid = () => crypto.randomUUID();

/** Local camelCase field -> server column. */
const listColumns: Record<string, string> = {
  id: 'id',
  ownerId: 'owner_id',
  title: 'title',
  note: 'note',
  kind: 'kind',
  icon: 'icon',
  archivedAt: 'archived_at',
  deletedAt: 'deleted_at',
  createdAt: 'created_at',
};
const itemColumns: Record<string, string> = {
  id: 'id',
  listId: 'list_id',
  name: 'name',
  quantity: 'quantity',
  unit: 'unit',
  note: 'note',
  purchasedAt: 'purchased_at',
  purchasedBy: 'purchased_by',
  position: 'position',
  createdBy: 'created_by',
  deletedAt: 'deleted_at',
  createdAt: 'created_at',
};

const activityColumns: Record<string, string> = { id: 'id', listId: 'list_id', type: 'type', payload: 'payload' };

const notificationColumns: Record<string, string> = { readAt: 'read_at' };
const profileColumns: Record<string, string> = {
  displayName: 'display_name',
  avatarTone: 'avatar_tone',
  defaultListId: 'default_list_id',
  unitSystem: 'unit_system',
  theme: 'theme',
  unitPrefs: 'unit_prefs',
};
const settingsColumns: Record<string, string> = {
  pushEnabled: 'push_enabled',
  invitations: 'invitations',
  listActivity: 'list_activity',
  shoppingUpdates: 'shopping_updates',
  reminders: 'reminders',
  remindDay: 'remind_day',
  remindTime: 'remind_time',
};

const columnMaps: Record<Entity, Record<string, string>> = {
  lists: listColumns,
  items: itemColumns,
  activity: activityColumns,
  notifications: notificationColumns,
  profiles: profileColumns,
  notification_settings: settingsColumns,
};
export const columnsFor = (entity: Entity) => columnMaps[entity];

function toServer(entity: Entity, patch: Record<string, unknown>): Record<string, unknown> {
  const cols = columnsFor(entity);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(patch)) {
    const col = cols[k];
    if (col) out[col] = v;
  }
  return out;
}

async function enqueue(entity: Entity, op: 'insert' | 'update', entityId: string, patch: Record<string, unknown>) {
  await db.outbox.add({
    id: uuid(),
    entity,
    op,
    entityId,
    payload: toServer(entity, patch),
    attempts: 0,
    nextRetryAt: 0,
    createdAt: Date.now(),
  });
}

function me(): string {
  const id = currentUserId();
  if (!id) throw new Error('Not signed in');
  return id;
}

// Lists ------------------------------------------------------------------------

export type NewList = { title: string; note?: string; kind?: ListKind; icon?: ListIcon };

export async function createList(input: NewList): Promise<ListRow> {
  const t = now();
  const row: ListRow = {
    id: uuid(),
    ownerId: me(),
    title: input.title.trim(),
    note: (input.note ?? '').trim(),
    kind: input.kind ?? 'groceries',
    icon: input.icon ?? 'bag',
    archivedAt: null,
    deletedAt: null,
    createdAt: t,
    updatedAt: t,
  };
  await db.transaction('rw', [db.lists, db.members, db.outbox], async () => {
    await db.lists.add(row);
    await db.members.put({ key: `${row.id}:${row.ownerId}`, listId: row.id, userId: row.ownerId, role: 'owner', joinedAt: t });
    const { updatedAt: _u, ...insert } = row;
    await enqueue('lists', 'insert', row.id, insert);
  });
  requestSync('write');
  return row;
}

export type ListPatch = Partial<Pick<ListRow, 'title' | 'note' | 'kind' | 'icon' | 'archivedAt' | 'deletedAt'>>;

export async function updateList(id: string, patch: ListPatch) {
  if (patch.title !== undefined) patch.title = patch.title.trim();
  await db.transaction('rw', [db.lists, db.outbox], async () => {
    await db.lists.update(id, { ...patch, updatedAt: now() });
    await enqueue('lists', 'update', id, patch);
  });
  requestSync('write');
}

/** Owner only (enforced by RLS). Soft delete: items disappear with the list. */
export const deleteList = (id: string) => updateList(id, { deletedAt: now() });
export const restoreList = (id: string) => updateList(id, { deletedAt: null });

// Items ------------------------------------------------------------------------

export type NewItem = { listId: string; name: string; quantity?: number | null; unit?: string | null; note?: string };

export async function addItem(input: NewItem): Promise<ItemRow> {
  const t = now();
  let row!: ItemRow;
  await db.transaction('rw', [db.items, db.outbox], async () => {
    const last = await db.items.where('listId').equals(input.listId).toArray();
    const position = last.reduce((m, i) => Math.max(m, i.position), 0) + 1;
    row = {
      id: uuid(),
      listId: input.listId,
      name: input.name.trim(),
      quantity: input.quantity ?? null,
      unit: input.unit?.trim() || null,
      note: (input.note ?? '').trim(),
      purchasedAt: null,
      purchasedBy: null,
      position,
      createdBy: me(),
      deletedAt: null,
      createdAt: t,
      updatedAt: t,
    };
    await db.items.add(row);
    const { updatedAt: _u, purchasedAt: _p, purchasedBy: _b, deletedAt: _d, ...insert } = row;
    await enqueue('items', 'insert', row.id, insert);
  });
  requestSync('write');
  return row;
}

export type ItemPatch = Partial<Pick<ItemRow, 'name' | 'quantity' | 'unit' | 'note' | 'listId' | 'position' | 'purchasedAt' | 'deletedAt'>>;

export async function updateItem(id: string, patch: ItemPatch) {
  if (patch.name !== undefined) patch.name = patch.name.trim();
  if (patch.note !== undefined) patch.note = patch.note.trim();
  await db.transaction('rw', [db.items, db.outbox], async () => {
    const local: Partial<ItemRow> = { ...patch, updatedAt: now() };
    if ('purchasedAt' in patch) local.purchasedBy = patch.purchasedAt ? me() : null;
    await db.items.update(id, local);
    // purchased_by is set by the server trigger (sync rule 2)
    await enqueue('items', 'update', id, patch);
  });
  requestSync('write');
}

/** Sync rule 2: ticking only touches this item's purchased fields. */
export const setPurchased = (id: string, purchased: boolean) => updateItem(id, { purchasedAt: purchased ? now() : null });

/** Sync rule 3: soft delete so Undo and sync both work. */
export const deleteItem = (id: string) => updateItem(id, { deletedAt: now() });
export const restoreItem = (id: string) => updateItem(id, { deletedAt: null });

export async function moveItem(id: string, listId: string) {
  const last = await db.items.where('listId').equals(listId).toArray();
  const position = last.reduce((m, i) => Math.max(m, i.position), 0) + 1;
  await updateItem(id, { listId, position });
}

async function bulkUpdate(ids: string[], patch: ItemPatch) {
  if (!ids.length) return;
  const t = now();
  await db.transaction('rw', [db.items, db.outbox], async () => {
    for (const id of ids) {
      const local: Partial<ItemRow> = { ...patch, updatedAt: t };
      if ('purchasedAt' in patch) local.purchasedBy = patch.purchasedAt ? me() : null;
      await db.items.update(id, local);
      await enqueue('items', 'update', id, patch);
    }
  });
  requestSync('write');
}

async function liveItems(listId: string) {
  return (await db.items.where('listId').equals(listId).toArray()).filter((i) => !i.deletedAt);
}

/** Screen 23 "Uncheck all items". Returns the ids changed, for Undo. */
export async function uncheckAll(listId: string): Promise<Array<{ id: string; purchasedAt: string }>> {
  const done = (await liveItems(listId)).filter((i) => i.purchasedAt);
  await bulkUpdate(
    done.map((i) => i.id),
    { purchasedAt: null },
  );
  return done.map((i) => ({ id: i.id, purchasedAt: i.purchasedAt! }));
}

/** Screen 23 "Clear purchased items" (soft delete). Returns ids for Undo. */
export async function clearPurchased(listId: string): Promise<string[]> {
  const ids = (await liveItems(listId)).filter((i) => i.purchasedAt).map((i) => i.id);
  await bulkUpdate(ids, { deletedAt: now() });
  return ids;
}

export async function restoreItems(ids: string[]) {
  await bulkUpdate(ids, { deletedAt: null });
}

export async function recheckItems(entries: Array<{ id: string; purchasedAt: string }>) {
  const t = now();
  await db.transaction('rw', [db.items, db.outbox], async () => {
    for (const e of entries) {
      await db.items.update(e.id, { purchasedAt: e.purchasedAt, purchasedBy: me(), updatedAt: t });
      await enqueue('items', 'update', e.id, { purchasedAt: e.purchasedAt });
    }
  });
  requestSync('write');
}

// Activity ----------------------------------------------------------------------

/** Append-only event (e.g. trip started / finished) for other members to see. */
export async function logActivity(listId: string, type: ActivityType, payload: Record<string, unknown> = {}) {
  const row = { id: uuid(), listId, actorId: me(), type, payload, createdAt: now() };
  await db.transaction('rw', [db.activity, db.outbox], async () => {
    await db.activity.add(row);
    await enqueue('activity', 'insert', row.id, { id: row.id, listId, type, payload });
  });
  requestSync('write');
}

/** "Reuse this list next time": every item back to unticked (PRD open question; design assumes all items). */
export async function resetForNextTime(listId: string) {
  const done = (await liveItems(listId)).filter((i) => i.purchasedAt);
  await bulkUpdate(
    done.map((i) => i.id),
    { purchasedAt: null },
  );
}

// Notifications -------------------------------------------------------------------

/** Mark inbox rows read (synced like any other write). */
export async function markNotificationsRead(ids: string[]) {
  if (!ids.length) return;
  const t = now();
  await db.transaction('rw', [db.notifications, db.outbox], async () => {
    for (const id of ids) {
      await db.notifications.update(id, { readAt: t });
      await enqueue('notifications', 'update', id, { readAt: t });
    }
  });
  requestSync('write');
}

// Profile and settings (phase 7; work offline like everything else) ---------------

export type ProfilePatch = Partial<Pick<ProfileRow, 'displayName' | 'avatarTone' | 'defaultListId' | 'unitSystem' | 'theme' | 'unitPrefs'>>;

export async function updateProfile(patch: ProfilePatch) {
  const id = me();
  if (patch.displayName !== undefined) patch.displayName = patch.displayName.trim();
  await db.transaction('rw', [db.profiles, db.outbox], async () => {
    await db.profiles.update(id, patch);
    await enqueue('profiles', 'update', id, patch);
  });
  requestSync('write');
}

export const defaultSettings: NotificationSettings = {
  pushEnabled: true,
  invitations: true,
  listActivity: true,
  shoppingUpdates: false,
  reminders: true,
  remindDay: 6,
  remindTime: '09:00',
};

export async function getSettings(): Promise<NotificationSettings> {
  const raw = await getMeta('notificationSettings');
  return raw ? { ...defaultSettings, ...(JSON.parse(raw) as Partial<NotificationSettings>) } : defaultSettings;
}

export async function updateSettings(patch: Partial<NotificationSettings>) {
  const id = me();
  const next = { ...(await getSettings()), ...patch };
  await db.transaction('rw', [db.meta, db.outbox], async () => {
    await setMeta('notificationSettings', JSON.stringify(next));
    await enqueue('notification_settings', 'update', id, patch);
  });
  requestSync('write');
}
