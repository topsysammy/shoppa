import Dexie, { type EntityTable } from 'dexie';

/** List kinds and icons from Figma screen 20. */
export type ListKind = 'groceries' | 'household' | 'party' | 'business';
export type ListIcon = 'bag' | 'home' | 'gift' | 'leaf' | 'broom' | 'box';

export type ListRow = {
  id: string;
  ownerId: string;
  title: string;
  note: string;
  kind: ListKind;
  icon: ListIcon;
  archivedAt: string | null;
  deletedAt: string | null;
  createdAt: string;
  /** Server time once synced; local time for unsynced edits. */
  updatedAt: string;
};

export type ItemRow = {
  id: string;
  listId: string;
  name: string;
  quantity: number | null;
  unit: string | null;
  note: string;
  purchasedAt: string | null;
  purchasedBy: string | null;
  position: number;
  createdBy: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type MemberRow = {
  /** `${listId}:${userId}` */
  key: string;
  listId: string;
  userId: string;
  role: 'owner' | 'member';
  joinedAt: string;
};

export type ProfileRow = {
  id: string;
  displayName: string;
  avatarTone: 'ink' | 'blue' | 'peach' | 'lavender' | 'mint';
  defaultListId: string | null;
  unitSystem: 'metric' | 'imperial';
  theme: 'light' | 'dark' | 'system';
  /** Screen 59: quick-pick units and the user's own market measures. */
  unitPrefs?: { quick: string[]; market: string[] };
};

/** Screen 56 toggles (server table notification_settings). */
export type NotificationSettings = {
  pushEnabled: boolean;
  invitations: boolean;
  listActivity: boolean;
  shoppingUpdates: boolean;
  reminders: boolean;
  remindDay: number;
  remindTime: string;
};

export type ActivityType = 'trip_started' | 'trip_finished';

export type ActivityRow = {
  id: string;
  listId: string;
  actorId: string | null;
  type: ActivityType | string;
  payload: Record<string, unknown>;
  createdAt: string;
};

export type NotificationRow = {
  id: string;
  listId: string | null;
  actorId: string | null;
  type: 'member_joined' | 'items_added' | 'items_purchased' | 'trip_started' | 'trip_finished';
  count: number;
  payload: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Entity = 'lists' | 'items' | 'activity' | 'notifications' | 'profiles' | 'notification_settings';

/** Outbox (device only, PRD section 7): the local write queue. */
export type OutboxOp = {
  seq?: number;
  id: string;
  entity: Entity;
  op: 'insert' | 'update';
  entityId: string;
  /** Changed fields only, in server column names (sync rule 1). */
  payload: Record<string, unknown>;
  attempts: number;
  nextRetryAt: number;
  createdAt: number;
  lastError?: string;
};

export type MetaRow = { key: string; value: string };

export class ShoppaDB extends Dexie {
  lists!: EntityTable<ListRow, 'id'>;
  items!: EntityTable<ItemRow, 'id'>;
  members!: EntityTable<MemberRow, 'key'>;
  profiles!: EntityTable<ProfileRow, 'id'>;
  outbox!: EntityTable<OutboxOp, 'seq'>;
  meta!: EntityTable<MetaRow, 'key'>;
  activity!: EntityTable<ActivityRow, 'id'>;
  notifications!: EntityTable<NotificationRow, 'id'>;

  constructor() {
    super('shoppa');
    this.version(1).stores({
      lists: 'id, updatedAt, deletedAt',
      items: 'id, listId, updatedAt, createdAt',
      members: 'key, listId, userId',
      profiles: 'id',
      outbox: '++seq, entityId, nextRetryAt',
      meta: 'key',
    });
    // Phase 4: activity (trip started / finished, screen 37)
    this.version(2).stores({ activity: 'id, listId, createdAt' });
    // Phase 6: in-app inbox (screen 51)
    this.version(3).stores({ notifications: 'id, createdAt, readAt' });
  }
}

/**
 * One IndexedDB database shared by every open tab (sync rule 7). Dexie's
 * liveQuery propagates writes from one tab to the others through a
 * BroadcastChannel, so lists update everywhere without a reload.
 */
export const db = new ShoppaDB();

export async function getMeta(key: string): Promise<string | undefined> {
  return (await db.meta.get(key))?.value;
}

export async function setMeta(key: string, value: string) {
  await db.meta.put({ key, value });
}

/** Clears all local data (sign-out of a different user; P10 account deletion). */
export async function clearLocalData() {
  await db.transaction('rw', [db.lists, db.items, db.members, db.profiles, db.outbox, db.meta, db.activity, db.notifications], async () => {
    await Promise.all([db.lists.clear(), db.items.clear(), db.members.clear(), db.profiles.clear(), db.outbox.clear(), db.meta.clear(), db.activity.clear(), db.notifications.clear()]);
  });
}
