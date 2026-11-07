import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar } from '@/components/Avatar';
import { TopBar } from '@/components/TopBar';
import { db, type NotificationRow } from '@/db/schema';
import { useLiveQuery } from '@/db/useLiveQuery';
import { markNotificationsRead } from '@/db/repo';
import { cn } from '@/lib/cn';
import { EmptyState } from '@/features/lists/EmptyState';
import { personOf, shortName, usePeople, type Person } from '@/features/sharing/people';
import { removePendingInvite, usePendingInvites } from '@/features/sharing/pendingInvites';

const when = (iso: string) =>
  new Date(iso).toLocaleString('en-NG', { weekday: 'long', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).replace(/ (am|pm)$/i, (m) => m.toUpperCase());

function text(n: NotificationRow, who: Person, list: string) {
  const name = <strong className="font-semibold">{shortName(who)}</strong>;
  const names = (n.payload.names as string[] | undefined) ?? [];
  switch (n.type) {
    case 'items_added':
      return (
        <>
          {name} <strong className="font-semibold">added {n.count > 1 ? `${n.count} items` : (names[0] ?? 'an item')}</strong> to {list}.
        </>
      );
    case 'items_purchased':
      return (
        <>
          {name} <strong className="font-semibold">completed {n.count > 1 ? `${n.count} items` : (names[0] ?? 'an item')}</strong> on {list}.
        </>
      );
    case 'trip_started':
      return (
        <>
          {name} started shopping {list}.
        </>
      );
    case 'trip_finished': {
      const b = n.payload.bought as number | undefined;
      const t = n.payload.total as number | undefined;
      return (
        <>
          {name} finished shopping {list}
          {b != null && t != null ? ` · ${b}/${t}` : ''}.
        </>
      );
    }
    case 'member_joined':
      return (
        <>
          {name} joined {list}.
        </>
      );
  }
}

/**
 * Screen 51 Notifications: the in-app inbox every user has, with or without
 * push (N4). Pending invites saved from invite links appear at the top.
 * Opening the inbox marks everything read.
 */
export function NotificationsPage() {
  const navigate = useNavigate();
  const people = usePeople();
  const pending = usePendingInvites();
  const rows = useLiveQuery(async () => (await db.notifications.toArray()).sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1)), []);
  const lists = useLiveQuery(async () => new Map((await db.lists.toArray()).map((l) => [l.id, l.title])), []);

  // Mark read a moment after showing, so the unread dots are visible first.
  useEffect(() => {
    if (!rows) return;
    const unread = rows.filter((r) => !r.readAt).map((r) => r.id);
    if (!unread.length) return;
    const t = window.setTimeout(() => void markNotificationsRead(unread), 1500);
    return () => window.clearTimeout(t);
  }, [rows]);

  const today = new Date().toDateString();
  const todayRows = rows?.filter((r) => new Date(r.createdAt).toDateString() === today) ?? [];
  const earlier = rows?.filter((r) => new Date(r.createdAt).toDateString() !== today) ?? [];

  const row = (n: NotificationRow) => {
    const who = personOf(people, n.actorId);
    const list = (n.listId && lists?.get(n.listId)) || 'a list';
    return (
      <li key={n.id}>
        <button
          type="button"
          onClick={() => n.listId && navigate(`/lists/${n.listId}`)}
          className="focus-ring flex w-full items-start gap-3 border-b border-line py-4 text-left"
        >
          <span className={cn('mt-2 size-2 shrink-0 rounded-full', n.readAt ? 'bg-transparent' : 'bg-info')} aria-hidden />
          <span className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="type-body text-ink">
              {n.readAt ? null : <span className="sr-only">Unread: </span>}
              {text(n, who, list)}
            </span>
            <span className="type-small text-secondary">{when(n.createdAt)}</span>
          </span>
          <Avatar size={36} name={who.name} tone={who.tone} />
        </button>
      </li>
    );
  };

  return (
    <div className="flex min-h-[calc(100dvh-96px)] flex-col desktop:mx-auto desktop:min-h-dvh desktop:w-full desktop:max-w-[640px]">
      <TopBar
        title="Notifications"
        left={{ icon: 'back', label: 'Back', onClick: () => navigate(-1) }}
        right={{ icon: 'settings', label: 'Notification settings', onClick: () => navigate('/settings/notifications') }}
      />
      <section className="mt-[18px] flex flex-1 flex-col rounded-t-32 bg-surface px-5 pb-8 pt-4 desktop:rounded-32">
        {rows && rows.length === 0 && pending.length === 0 ? (
          <EmptyState icon="bell" title="No notifications yet" body="You’ll hear here when people join your lists, add items or finish shopping." />
        ) : (
          <>
            {pending.length || todayRows.length ? <DayChip label="Today" /> : null}
            <ul>
              {pending.map((inv) => (
                <li key={inv.token} className="flex items-start gap-3 border-b border-line py-4">
                  <span className="mt-2 size-2 shrink-0 rounded-full bg-info" aria-hidden />
                  <div className="flex min-w-0 flex-1 flex-col gap-2.5">
                    <p className="type-body text-ink">
                      <strong className="font-semibold">You were invited</strong> to join {inv.title} by {inv.inviter.split(' ')[0]}.
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => navigate(`/join/${inv.token}?accept=1`)}
                        className="focus-ring inline-flex h-11 items-center rounded-full bg-brand-strong px-5 type-label text-on-brand"
                      >
                        Join
                      </button>
                      <button
                        type="button"
                        onClick={() => removePendingInvite(inv.token)}
                        className="focus-ring inline-flex h-11 items-center rounded-full border border-line-strong px-5 type-label text-ink hover:bg-muted"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                  <Avatar size={36} name={inv.inviter} tone="peach" />
                </li>
              ))}
              {todayRows.map(row)}
            </ul>
            {earlier.length ? (
              <>
                <DayChip label="Earlier" />
                <ul>{earlier.map(row)}</ul>
              </>
            ) : null}
          </>
        )}
      </section>
    </div>
  );
}

function DayChip({ label }: { label: string }) {
  return (
    <h2 className="my-2.5 flex justify-center">
      <span className="rounded-full bg-muted px-3 py-1 type-small text-secondary">{label}</span>
    </h2>
  );
}
