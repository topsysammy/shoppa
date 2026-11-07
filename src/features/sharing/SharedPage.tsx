import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { IconButton } from '@/components/IconButton';
import { Icon } from '@/components/icons/Icon';
import { ListCard } from '@/components/ListCard';
import { db } from '@/db/schema';
import { useLiveQuery } from '@/db/useLiveQuery';
import { statusOf, useListSummaries } from '@/features/lists/data';
import { EmptyState } from '@/features/lists/EmptyState';
import { openSheet } from '@/features/lists/sheetStore';
import { currentUserId } from '@/sync/currentUser';
import { personOf, shortName, usePeople } from './people';
import { removePendingInvite, usePendingInvites } from './pendingInvites';

type Filter = 'all' | 'with-me' | 'by-me';
const LIVE_MS = 3 * 60 * 60 * 1000;

/** Screens 42 Shared tab and 43 Shared · empty. */
export function SharedPage() {
  const navigate = useNavigate();
  const summaries = useListSummaries();
  const people = usePeople();
  const pending = usePendingInvites();
  const [filter, setFilter] = useState<Filter>('all');
  const me = currentUserId();

  // Who is shopping each list right now (screen 42 "Kemi shopping" badge).
  const shopping = useLiveQuery(async () => {
    const rows = (await db.activity.toArray()).filter((r) => r.type === 'trip_started' || r.type === 'trip_finished').sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
    const open = new Map<string, Map<string, string>>();
    for (const r of rows) {
      if (!r.actorId || r.actorId === me) continue;
      const m = open.get(r.listId) ?? new Map<string, string>();
      if (r.type === 'trip_started') m.set(r.actorId, (r.payload.startedAt as string) ?? r.createdAt);
      else m.delete(r.actorId);
      open.set(r.listId, m);
    }
    const out = new Map<string, string>();
    for (const [listId, m] of open) {
      for (const [actor, at] of m) if (Date.now() - new Date(at).getTime() < LIVE_MS) out.set(listId, actor);
    }
    return out;
  }, [me]);

  const shared = (summaries ?? []).filter((s) => s.members.length > 1);
  const shown = shared.filter((s) => (filter === 'all' ? true : filter === 'by-me' ? s.list.ownerId === me : s.list.ownerId !== me));
  const empty = summaries !== undefined && shared.length === 0 && pending.length === 0;

  return (
    <div className="flex min-h-[calc(100dvh-96px)] flex-col desktop:mx-auto desktop:min-h-dvh desktop:w-full desktop:max-w-[720px]">
      <header className="flex items-center gap-3 px-5 pt-[max(20px,env(safe-area-inset-top))] desktop:pt-8">
        <span className="size-11 shrink-0" aria-hidden />
        <h1 className="flex-1 text-center type-title text-ink">Shared</h1>
        <IconButton icon="link" label="Join with an invite link" onClick={() => openSheet({ kind: 'join' })} />
      </header>

      {pending.map((inv) => (
        <section key={inv.token} aria-label={`Invitation to ${inv.title}`} className="mx-5 mt-[18px] flex flex-col gap-3 rounded-[22px] bg-brand-strong p-4 text-on-brand">
          <div className="flex items-start gap-3">
            <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-yellow text-on-yellow">
              <Icon name="mail" size={18} />
            </span>
            <div className="flex min-w-0 flex-col">
              <span className="type-body-strong">{inv.inviter.split(' ')[0]} invited you</span>
              <span className="type-caption">
                {inv.title} · {inv.itemCount} {inv.itemCount === 1 ? 'item' : 'items'}
              </span>
            </div>
          </div>
          <div className="flex gap-2.5 pl-12">
            <button
              type="button"
              onClick={() => navigate(`/join/${inv.token}?accept=1`)}
              className="focus-ring inline-flex h-11 items-center rounded-full bg-white px-5 type-label text-ink"
            >
              Join
            </button>
            <button
              type="button"
              onClick={() => removePendingInvite(inv.token)}
              className="focus-ring inline-flex h-11 items-center rounded-full border border-white/50 px-5 type-label text-white hover:bg-white/10"
            >
              Decline
            </button>
          </div>
        </section>
      ))}

      <section className="mt-[18px] flex flex-1 flex-col gap-3 rounded-t-32 bg-surface px-5 pb-6 pt-5 desktop:rounded-32">
        {empty ? (
          <EmptyState title="No shared lists yet." body="Share a shopping list with someone or join one you’ve been invited to.">
            <span className="-order-1 mb-2 flex" aria-hidden>
              <span className="size-12 rounded-full bg-avatar-blue" />
              <span className="-ml-3 size-12 rounded-full border-2 border-surface bg-avatar-peach" />
              <span className="-ml-3 size-12 rounded-full border-2 border-surface bg-avatar-lavender" />
            </span>
            <Button fullWidth={false} onClick={() => navigate('/lists')}>
              Share a list
            </Button>
            <button type="button" onClick={() => openSheet({ kind: 'join' })} className="focus-ring rounded-12 px-3 py-2 type-body-medium text-link">
              I have an invite link
            </button>
          </EmptyState>
        ) : (
          <>
            <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none]" role="toolbar" aria-label="Filter shared lists">
              {(
                [
                  ['all', 'All'],
                  ['with-me', 'Shared with me'],
                  ['by-me', 'By me'],
                ] as Array<[Filter, string]>
              ).map(([id, label]) => (
                <Chip key={id} label={label} state={filter === id ? 'selected' : 'default'} onClick={() => setFilter(id)} />
              ))}
            </div>
            {shown.length ? (
              shown.map((s) => {
                const shopper = shopping?.get(s.list.id);
                const status = shopper ? { label: `${shortName(personOf(people, shopper))} shopping`, tone: 'done' as const } : statusOf(s.stats);
                return (
                  <ListCard
                    key={s.list.id}
                    title={s.list.title}
                    status={status}
                    members={s.members.map((m) => personOf(people, m.userId))}
                    itemCount={s.stats.total}
                    noteCount={s.stats.notes}
                    progress={s.stats.total ? s.stats.purchased / s.stats.total : 0}
                    onOpen={() => navigate(`/lists/${s.list.id}`)}
                  />
                );
              })
            ) : (
              <p className="py-8 text-center type-body text-secondary">No lists here yet.</p>
            )}
          </>
        )}
      </section>
    </div>
  );
}
