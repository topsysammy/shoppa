/**
 * Development only: `?seed=demo` signs in a fake local user and fills
 * IndexedDB with realistic lists so screens can be checked without a
 * Supabase project. Never included in production builds (guarded by
 * import.meta.env.DEV in main.tsx).
 */
import { db, type ItemRow, type ListRow } from '@/db/schema';

const USER = '00000000-0000-4000-8000-000000000001';

export async function seedDemo(count = 0) {
  const now = Date.now();
  const iso = (msAgo: number) => new Date(now - msAgo).toISOString();
  localStorage.setItem(
    'shoppa.auth',
    JSON.stringify({
      access_token: 'dev',
      refresh_token: 'dev',
      token_type: 'bearer',
      expires_in: 3600 * 24 * 365,
      expires_at: Math.floor(now / 1000) + 3600 * 24 * 365,
      user: { id: USER, email: 'tope@email.com', user_metadata: { display_name: 'Temitope Samuel' }, aud: 'authenticated', app_metadata: {}, created_at: iso(0) },
    }),
  );
  localStorage.setItem('shoppa.onboarded', '1');
  await db.meta.put({ key: 'userId', value: USER });
  await db.profiles.put({ id: USER, displayName: 'Temitope Samuel', avatarTone: 'ink', defaultListId: null, unitSystem: 'metric', theme: 'system' });

  const list = (id: string, title: string, kind: ListRow['kind'], note = '', ago = 0): ListRow => ({
    id, ownerId: USER, title, note, kind, icon: kind === 'household' ? 'broom' : kind === 'party' ? 'gift' : kind === 'business' ? 'box' : 'bag',
    archivedAt: null, deletedAt: null, createdAt: iso(ago), updatedAt: iso(ago),
  });
  const lists = [
    list('11111111-1111-4111-8111-111111111111', 'Weekly Groceries', 'groceries', 'Things we need for the house', 1000),
    list('22222222-2222-4222-8222-222222222222', 'Shop restock', 'business', '', 5000),
    list('33333333-3333-4333-8333-333333333333', 'House Supplies', 'household', '', 9000),
    list('44444444-4444-4444-8444-444444444444', 'Birthday party', 'party', '', 20000),
  ];
  let pos = 0;
  const item = (listId: string, name: string, quantity: number | null, unit: string | null, note = '', purchased = false): ItemRow => ({
    id: crypto.randomUUID(), listId, name, quantity, unit, note, purchasedAt: purchased ? iso(60_000) : null, purchasedBy: purchased ? USER : null,
    position: ++pos, createdBy: USER, deletedAt: null, createdAt: iso(86_400_000 * 2 - pos * 1000), updatedAt: iso(pos * 1000),
  });
  const [a, b, c, d] = lists.map((l) => l.id) as [string, string, string, string];
  const items: ItemRow[] = [
    item(a, 'Rice', 1, 'bag', 'Mama Gold, the long grain one'),
    item(a, 'Tomatoes', 2, 'paint', 'Firm ones for stew', true),
    item(a, 'Yam', 3, 'tuber'),
    item(a, 'Peak milk', 1, 'tin', 'Big tin'),
    item(a, 'Plantain', 1, 'bunch', 'Ripe'),
    item(a, 'Garri', 1, 'congo', '', true),
    item(a, 'Eggs', 1, 'crate'),
    item(a, 'Detergent', 1, 'pack', '', true),
    item(b, 'Indomie', 4, 'box'),
    item(b, 'Sugar', 2, 'bag'),
    item(b, 'Groundnut oil', 3, 'bottle'),
    item(c, 'Toilet roll', 2, 'pack', '', true),
    item(c, 'Bleach', 1, 'bottle', '', true),
    item(c, 'Sponge', 3, 'piece'),
    item(d, 'Chin chin', 2, 'bag', '', true),
    item(d, 'Malt', 1, 'crate', '', true),
  ];
  for (let i = 0; i < count; i++) items.push(item(b, `Restock item ${i + 1}`, (i % 5) + 1, 'pack'));
  await db.lists.bulkPut(lists);
  await db.members.bulkPut(lists.map((l) => ({ key: `${l.id}:${USER}`, listId: l.id, userId: USER, role: 'owner' as const, joinedAt: l.createdAt })));
  await db.items.bulkPut(items);
}
