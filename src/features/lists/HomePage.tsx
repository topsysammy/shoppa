import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { IconButton } from '@/components/IconButton';
import { Icon } from '@/components/icons/Icon';
import { ListCard } from '@/components/ListCard';
import { firstName, useAuth } from '@/features/auth/AuthProvider';
import { isCompleted, statusOf, useListSummaries, useMyProfile, type ListSummary } from './data';
import { personOf, usePeople } from '@/features/sharing/people';
import { useUnreadCount } from '@/features/notifications/data';
import { EmptyState } from './EmptyState';
import { HomeBanner } from './HomeBanner';
import { openSheet } from './sheetStore';

type HomeFilter = 'all' | 'groceries' | 'household' | 'shared';
const filters: Array<{ id: HomeFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'groceries', label: 'Groceries' },
  { id: 'household', label: 'Household' },
  { id: 'shared', label: 'Shared' },
];

/** Screens 13 Home and 17 Home · first run. Desktop (W5) widens to a two-column card grid. */
export function HomePage() {
  const { displayName } = useAuth();
  const profile = useMyProfile();
  const summaries = useListSummaries();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<HomeFilter>('all');
  const unread = useUnreadCount();
  const name = profile?.displayName || displayName;
  const active = summaries?.filter((s) => !isCompleted(s.stats)) ?? [];
  const shown = (summaries ?? []).filter((s) =>
    filter === 'all' ? true : filter === 'shared' ? s.members.length > 1 : s.list.kind === filter,
  );

  return (
    <div className="flex min-h-[calc(100dvh-96px)] flex-col desktop:min-h-dvh">
      <section className="flex flex-col items-center px-5 pt-[max(20px,env(safe-area-inset-top))] desktop:mx-auto desktop:w-full desktop:max-w-[960px] desktop:px-8 desktop:pt-10">
        <div className="flex w-full items-center justify-between desktop:hidden">
          <Link to="/profile" className="focus-ring rounded-full" aria-label="Profile">
            <Avatar size={44} name={name || 'You'} tone={profile?.avatarTone ?? 'ink'} />
          </Link>
          <IconButton icon="bell" label={unread ? `Notifications, ${unread} unread` : 'Notifications'} dot={unread > 0} onClick={() => navigate('/notifications')} />
        </div>
        <h1 className="mt-3.5 type-display text-ink desktop:mt-0">Hello{name ? `, ${firstName(name)}` : ''}</h1>
        {summaries?.length ? (
          <p className="mt-1 text-[14px] leading-[18px] text-secondary">
            {active.length === 0
              ? 'All your lists are done'
              : `You have ${active.length} active shopping ${active.length === 1 ? 'list' : 'lists'}`}
          </p>
        ) : null}
        <button
          type="button"
          onClick={() => openSheet({ kind: 'quickAdd' })}
          className="focus-ring mt-4 flex h-[54px] w-full max-w-[640px] items-center gap-2.5 rounded-full border border-line-strong bg-surface pl-[18px] pr-1.5 text-left"
        >
          <span className="flex-1 type-body text-secondary">What do you need to buy?</span>
          <span className="inline-flex size-[42px] items-center justify-center rounded-full bg-brand-strong text-white">
            <Icon name="plus" size={20} strokeWidth={2.2} />
          </span>
        </button>
      </section>

      {summaries === undefined ? (
        <div className="mt-5 flex-1 rounded-t-32 bg-surface" aria-busy="true" />
      ) : summaries.length === 0 ? (
        <section className="mt-5 flex flex-1 flex-col rounded-t-32 bg-surface pt-[22px] desktop:mx-auto desktop:w-full desktop:max-w-[960px] desktop:rounded-32">
          <EmptyState illustration title="Nothing to shop for yet." body="Create your first shopping list and start adding things as you remember them.">
            <Button fullWidth={false} onClick={() => openSheet({ kind: 'createList' })}>
              Create a List
            </Button>
            <button type="button" onClick={() => openSheet({ kind: 'join' })} className="focus-ring rounded-12 px-3 py-2 type-body-medium text-link">
              Join a shared list
            </button>
          </EmptyState>
        </section>
      ) : (
        <>
          <section className="mt-5 flex flex-col gap-3.5 px-5 desktop:mx-auto desktop:w-full desktop:max-w-[960px] desktop:px-8">
            <HomeBanner onStart={() => openSheet({ kind: 'quickAdd' })} />
            <div className="flex items-center justify-between">
              <h2 className="type-heading text-ink">Active lists</h2>
              <Link to="/lists" className="focus-ring rounded-12 px-2 py-2 text-[14px] font-medium leading-[22px] text-link">
                See all
              </Link>
            </div>
            <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-3 [scrollbar-width:none] desktop:mx-0 desktop:px-0">
              {filters.map((f) => (
                <Chip key={f.id} label={f.label} state={filter === f.id ? 'selected' : 'default'} onClick={() => setFilter(f.id)} />
              ))}
            </div>
          </section>
          <section aria-label="Your lists" className="flex flex-1 flex-col gap-3.5 rounded-t-32 bg-surface px-5 pb-6 pt-[22px] desktop:mx-auto desktop:grid desktop:w-full desktop:max-w-[960px] desktop:grid-cols-2 desktop:content-start desktop:rounded-32 desktop:px-8 desktop:pb-8">
            {shown.length ? (
              shown.map((s) => <SummaryCard key={s.list.id} s={s} />)
            ) : (
              <p className="py-8 text-center type-body text-secondary desktop:col-span-2">No lists here yet.</p>
            )}
          </section>
        </>
      )}
    </div>
  );
}

export function SummaryCard({ s, selected }: { s: ListSummary; selected?: boolean }) {
  const navigate = useNavigate();
  const people = usePeople();
  return (
    <ListCard
      title={s.list.title}
      status={statusOf(s.stats)}
      members={s.members.map((m) => personOf(people, m.userId))}
      itemCount={s.stats.total}
      noteCount={s.stats.notes}
      progress={s.stats.total ? s.stats.purchased / s.stats.total : 0}
      selected={selected}
      onOpen={() => navigate(`/lists/${s.list.id}`)}
    />
  );
}
