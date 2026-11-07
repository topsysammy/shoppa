import { db, type ProfileRow } from '@/db/schema';
import { useLiveQuery } from '@/db/useLiveQuery';
import type { AvatarTone } from '@/components/Avatar';
import { currentUserId } from '@/sync/currentUser';

export type Person = { id: string; name: string; tone: AvatarTone; isMe: boolean };

/** Names and avatar tones of everyone the user shares a list with (phase 5 RLS). */
export function usePeople(): Map<string, Person> {
  const rows = useLiveQuery(() => db.profiles.toArray(), []) ?? [];
  const me = currentUserId();
  return new Map(rows.map((p: ProfileRow) => [p.id, { id: p.id, name: p.displayName || 'Member', tone: p.avatarTone, isMe: p.id === me }]));
}

export function personOf(people: Map<string, Person>, id: string | null | undefined): Person {
  if (id && people.has(id)) return people.get(id)!;
  return { id: id ?? '', name: 'A member', tone: 'blue', isMe: false };
}

/** "You" for the current user, else first name. */
export const shortName = (p: Person) => (p.isMe ? 'You' : (p.name.split(/\s+/)[0] ?? p.name));
