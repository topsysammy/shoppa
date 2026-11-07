import { useNavigate, useParams } from 'react-router-dom';
import { Avatar } from '@/components/Avatar';
import { Icon, type IconName } from '@/components/icons/Icon';
import { TopBar } from '@/components/TopBar';
import { db, type ActivityRow } from '@/db/schema';
import { useLiveQuery } from '@/db/useLiveQuery';
import { cn } from '@/lib/cn';
import { formatQuantity } from '@/lib/units';
import { useList } from '@/features/lists/data';
import { EmptyState } from '@/features/lists/EmptyState';
import { personOf, shortName, usePeople, type Person } from './people';

type Entry = { key: string; actorId: string | null; at: string; text: React.ReactNode; badge: { icon: IconName; tone: string } };

const GROUP_MS = 15 * 60 * 1000;

function describe(rows: ActivityRow[], who: Person, people: Map<string, Person>): Omit<Entry, 'key' | 'actorId' | 'at'> | null {
  const first = rows[0]!;
  const p = first.payload as Record<string, unknown>;
  const name = (p.name as string) ?? 'an item';
  const n = rows.length;
  const actor = <strong className="font-semibold">{shortName(who)}</strong>;
  switch (first.type) {
    case 'item_purchased':
      return { text: <>{actor} completed {n > 1 ? `${n} items` : name}</>, badge: { icon: 'check', tone: 'bg-brand-strong' } };
    case 'item_added':
      return {
        text: <>{actor} added {n > 1 ? `${name} and ${n - 1} ${n === 2 ? 'other' : 'others'}` : name}</>,
        badge: { icon: 'plus', tone: 'bg-info' },
      };
    case 'item_updated':
      return {
        text: <>{actor} changed {name} to {formatQuantity((p.quantity as number | null) ?? null, (p.unit as string | null) ?? null) || 'no quantity'}</>,
        badge: { icon: 'edit', tone: 'bg-secondary' },
      };
    case 'item_deleted':
      return { text: <>{actor} removed {n > 1 ? `${n} items` : name}</>, badge: { icon: 'trash', tone: 'bg-danger' } };
    case 'trip_started':
      return { text: <>{actor} started shopping</>, badge: { icon: 'bag', tone: 'bg-brand-strong' } };
    case 'trip_finished': {
      const bought = p.bought as number | undefined;
      const total = p.total as number | undefined;
      return {
        text: <>{actor} finished shopping{bought != null && total != null ? ` · ${bought} of ${total} bought` : ''}</>,
        badge: { icon: 'bag-check', tone: 'bg-done' },
      };
    }
    case 'member_joined':
      return { text: <>{actor} joined the list</>, badge: { icon: 'users', tone: 'bg-link' } };
    case 'member_left':
      return { text: <>{actor} left the list</>, badge: { icon: 'logout', tone: 'bg-secondary' } };
    case 'member_removed': {
      const removed = personOf(people, p.user_id as string);
      return { text: <>{actor} removed {shortName(removed)}</>, badge: { icon: 'close', tone: 'bg-secondary' } };
    }
    case 'list_renamed':
      return { text: <>{actor} renamed the list to {(p.to as string) ?? ''}</>, badge: { icon: 'edit', tone: 'bg-secondary' } };
    default:
      return null;
  }
}

/** Consecutive events of the same kind by the same person within 15 min become one line ("Kemi completed 5 items"). */
export function buildFeed(rows: ActivityRow[], people: Map<string, Person>): Entry[] {
  const sorted = [...rows].sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1));
  const out: Entry[] = [];
  let group: ActivityRow[] = [];
  const flush = () => {
    if (!group.length) return;
    const head = group[0]!;
    const d = describe(group, personOf(people, head.actorId), people);
    if (d) out.push({ key: head.id, actorId: head.actorId, at: head.createdAt, ...d });
    group = [];
  };
  for (const r of sorted) {
    const prev = group[group.length - 1];
    const groupable = r.type === 'item_purchased' || r.type === 'item_added' || r.type === 'item_deleted';
    if (prev && groupable && prev.type === r.type && prev.actorId === r.actorId && new Date(prev.createdAt).getTime() - new Date(r.createdAt).getTime() < GROUP_MS) {
      group.push(r);
    } else {
      flush();
      group = [r];
    }
  }
  flush();
  return out;
}

function dayLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const y = new Date();
  y.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === y.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'short' });
}

export function timeLabel(iso: string): string {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  if (mins < 120) return '1 hr ago';
  return new Date(iso).toLocaleTimeString('en-NG', { hour: 'numeric', minute: '2-digit' }).toLowerCase();
}

/** Screen 45 List activity. */
export function ActivityPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const list = useList(id);
  const rows = useLiveQuery(() => db.activity.where('listId').equals(id).toArray(), [id]);
  const people = usePeople();
  const feed = rows ? buildFeed(rows, people) : undefined;

  let lastDay = '';
  return (
    <div className="flex min-h-[calc(100dvh-96px)] flex-col desktop:mx-auto desktop:min-h-dvh desktop:max-w-[640px]">
      <TopBar title="Activity" subtitle={list?.title} left={{ icon: 'back', label: 'Back', onClick: () => navigate(`/lists/${id}`) }} />
      <section className="mt-[18px] flex flex-1 flex-col rounded-t-32 bg-surface px-5 pb-8 pt-4 desktop:rounded-32">
        {feed && feed.length === 0 ? (
          <EmptyState icon="clock" title="No activity yet" body="When people add, change or tick items, you’ll see it here." />
        ) : (
          <ol aria-label="Activity" className="flex flex-col">
            {feed?.map((e) => {
              const day = dayLabel(e.at);
              const header = day !== lastDay;
              lastDay = day;
              const who = personOf(people, e.actorId);
              return (
                <li key={e.key}>
                  {header ? (
                    <h2 className="my-2.5 flex justify-center">
                      <span className="rounded-full bg-muted px-3 py-1 type-small text-secondary">{day}</span>
                    </h2>
                  ) : null}
                  <div className="flex items-center gap-3 border-b border-line py-3.5">
                    <span className="relative shrink-0">
                      <Avatar size={36} name={who.name} tone={who.tone} />
                      <span className={cn('absolute -bottom-0.5 -right-0.5 inline-flex size-4 items-center justify-center rounded-full text-white ring-2 ring-surface', e.badge.tone)} aria-hidden>
                        <Icon name={e.badge.icon} size={10} strokeWidth={3} />
                      </span>
                    </span>
                    <div className="flex min-w-0 flex-col">
                      <p className="type-body text-ink">{e.text}</p>
                      <p className="type-small text-secondary">
                        <time dateTime={e.at}>{timeLabel(e.at)}</time>
                      </p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </div>
  );
}
