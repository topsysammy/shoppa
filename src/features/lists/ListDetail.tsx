import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/Button';
import { IconButton } from '@/components/IconButton';
import { Icon } from '@/components/icons/Icon';
import { ItemRow as ItemRowView } from '@/components/ItemRow';
import { ProgressBar } from '@/components/ProgressBar';
import { SidePanel } from '@/components/SidePanel';
import { SwipeRow } from '@/components/SwipeRow';
import { TopBar } from '@/components/TopBar';
import { VirtualRows } from '@/components/VirtualRows';
import type { ItemRow } from '@/db/schema';
import { setPurchased } from '@/db/repo';
import { cn } from '@/lib/cn';
import { formatQuantity } from '@/lib/units';
import { useIsDesktop } from '@/lib/useMedia';
import { showToast } from '@/features/shell/toasts';
import { deleteWithUndo, togglePurchased } from './actions';
import { statsOf, useItem, useItems, useList } from './data';
import { db } from '@/db/schema';
import { useLiveQuery } from '@/db/useLiveQuery';
import { AvatarStack } from '@/components/Avatar';
import { personOf, shortName, usePeople } from '@/features/sharing/people';
import { buildFeed, timeLabel } from '@/features/sharing/ActivityPage';
import { currentUserId } from '@/sync/currentUser';
import { EmptyState } from './EmptyState';
import { ItemEditor } from './ItemEditor';
import { closeSheet, openSheet, useSheet } from './sheetStore';
import { LiveTripCard } from '@/features/shopping/LiveTripCard';
import { useLiveTripByOthers } from '@/features/shopping/trip';

const ROW_H = 68;

/**
 * Screens 21 List details, 22 List · empty, 27 Swipe actions, 32 Purchased + undo.
 * `pane` is the right-hand pane of the desktop two-pane layout (W6), where
 * item edit opens in a side panel beside the list.
 */
export function ListDetail({ listId, pane = false }: { listId: string; pane?: boolean }) {
  const navigate = useNavigate();
  const desktop = useIsDesktop();
  const list = useList(listId);
  const items = useItems(listId);
  const sheet = useSheet();
  const [showPurchased, setShowPurchased] = useState(true);
  const liveTrip = useLiveTripByOthers(listId);
  const people = usePeople();
  const members = useLiveQuery(() => db.members.where('listId').equals(listId).toArray(), [listId]) ?? [];
  const activity = useLiveQuery(() => db.activity.where('listId').equals(listId).toArray(), [listId]);

  if (list === undefined || items === undefined) return <div className="min-h-dvh" aria-busy="true" />;
  if (list === null || list.deletedAt) {
    return (
      <EmptyState icon="list" title="This list isn’t available" body="It may have been deleted, or you no longer have access to it.">
        <Button fullWidth={false} onClick={() => navigate('/lists')}>
          Go to my lists
        </Button>
      </EmptyState>
    );
  }

  const stats = statsOf(items);
  const shared = members.length > 1;
  const me = currentUserId();
  const owner = personOf(people, list.ownerId);
  // Screen 44: latest change by someone else, as a banner linking to the feed.
  const latest = shared && activity ? buildFeed(activity.filter((a) => a.actorId !== me), people)[0] : undefined;
  const toBuy = items.filter((i) => !i.purchasedAt).sort((a, b) => a.position - b.position);
  const purchased = items.filter((i) => i.purchasedAt).sort((a, b) => (b.purchasedAt! > a.purchasedAt! ? 1 : -1));
  const openItem = (i: ItemRow) => openSheet(desktop ? { kind: 'editItem', itemId: i.id } : { kind: 'itemActions', itemId: i.id });
  const panelItemId = pane && sheet.kind === 'editItem' ? sheet.itemId : null;

  const row = (i: ItemRow, idx: number, arr: ItemRow[]) => (
    <SwipeRow
      onComplete={i.purchasedAt ? undefined : () => void togglePurchased(i, true)}
      onEdit={() => openSheet({ kind: 'editItem', itemId: i.id })}
      onDelete={() => void deleteWithUndo(i)}
    >
      <ItemRowView
        name={liveTrip && i.purchasedAt && formatQuantity(i.quantity, i.unit) ? `${i.name} · ${formatQuantity(i.quantity, i.unit)}` : i.name}
        quantity={
          // Screen 37: while someone shops, bought rows show who and when ("Kemi · 1m").
          liveTrip && i.purchasedAt
            ? `${shortName(personOf(people, i.purchasedBy))} · ${Math.max(1, Math.round((Date.now() - new Date(i.purchasedAt).getTime()) / 60_000))}m`
            : formatQuantity(i.quantity, i.unit)
        }
        note={i.note || (shared ? `Added by ${shortName(personOf(people, i.createdBy)).replace(/^You$/, 'you')}` : undefined)}
        checked={Boolean(i.purchasedAt)}
        onToggle={(v) => void togglePurchased(i, v)}
        onOpen={() => openItem(i)}
        onEdit={() => openSheet({ kind: 'editItem', itemId: i.id })}
        onDelete={() => void deleteWithUndo(i)}
        onMore={() => openSheet({ kind: 'itemActions', itemId: i.id })}
        onUndo={i.purchasedAt && !liveTrip ? () => void setPurchased(i.id, false) : undefined}
        last={idx === arr.length - 1}
      />
    </SwipeRow>
  );

  const startShopping = () => {
    if (!stats.total) return showToast({ icon: 'bag', message: 'Add a few items before you shop' });
    navigate(`/lists/${list.id}/shop`);
  };

  return (
    <div className={cn('flex', pane ? 'min-h-full' : 'min-h-[calc(100dvh-96px)]')}>
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          title={list.title}
          subtitle={
            shared
              ? `Owner: ${owner.isMe ? 'you' : shortName(owner)} · ${stats.remaining} of ${stats.total} left`
              : stats.total === 0 && list.note
                ? list.note
                : undefined
          }
          left={pane ? undefined : { icon: 'back', label: 'Back', onClick: () => (window.history.length > 1 ? navigate(-1) : navigate('/lists')) }}
          right={{ icon: 'more', label: 'List options', onClick: () => openSheet({ kind: 'listOptions', listId: list.id }) }}
          children={
            shared ? (
              <button
                type="button"
                onClick={() => navigate(`/lists/${list.id}/members`)}
                aria-label={`Members: ${members.length}`}
                className="focus-ring -mr-1 flex min-h-11 items-center rounded-full px-1"
              >
                <AvatarStack people={members.map((m) => personOf(people, m.userId))} />
              </button>
            ) : undefined
          }
          className={pane ? 'pt-6' : undefined}
        />

        {liveTrip && stats.total > 0 ? (
          <div className="px-5 pt-[18px]">
            <LiveTripCard trip={liveTrip} stats={stats} name={shortName(personOf(people, liveTrip.actorId))} />
          </div>
        ) : stats.total > 0 ? (
          <div className="flex flex-col gap-2.5 px-5 pt-[18px]">
            <div className="flex items-start justify-between text-[14px] leading-[18px]">
              <p className="text-secondary">
                {stats.total} {stats.total === 1 ? 'item' : 'items'} · <span className={stats.purchased ? 'font-semibold text-ink' : ''}>{stats.remaining} remaining</span>
              </p>
              <p className="font-semibold text-ink">
                {stats.purchased} / {stats.total}
              </p>
            </div>
            <ProgressBar value={stats.purchased / stats.total} label={`${list.title} progress`} />
          </div>
        ) : null}

        <section className="mt-[18px] flex flex-1 flex-col gap-3 rounded-t-32 bg-surface px-5 pb-8 pt-[22px]">
          {stats.total === 0 ? (
            <EmptyState icon="bag" title="Your list is empty." body="Add something you need to buy.">
              <Button fullWidth={false} icon="plus" onClick={() => openSheet({ kind: 'addItem', listId: list.id })}>
                Add Item
              </Button>
            </EmptyState>
          ) : (
            <>
              {latest && !liveTrip ? (
                <button
                  type="button"
                  onClick={() => navigate(`/lists/${list.id}/activity`)}
                  className="focus-ring -mt-1 flex items-center gap-3 rounded-[18px] bg-brand-strong px-3.5 py-3 text-left text-on-brand"
                >
                  <AvatarStack people={[personOf(people, latest.actorId)]} />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate type-label">{latest.text}</span>
                    <span className="type-small opacity-90">{timeLabel(latest.at)} · See activity</span>
                  </span>
                  <Icon name="chevron-right" size={18} />
                </button>
              ) : null}
              <div className="flex gap-2.5">
                <Button icon="bag" onClick={startShopping} className="flex-1">
                  Start Shopping
                </Button>
                <IconButton
                  icon="share"
                  label="Share list"
                  className="size-[54px]!"
                  onClick={() => openSheet({ kind: 'share', listId: list.id })}
                />
              </div>
              <button
                type="button"
                onClick={() => openSheet({ kind: 'addItem', listId: list.id })}
                className="focus-ring flex h-12 items-center gap-2.5 rounded-full bg-muted pl-4 text-left text-secondary hover:bg-selected"
              >
                <Icon name="plus" size={18} className="text-ink" />
                <span className="type-body">Add an item</span>
                {desktop ? <kbd className="ml-auto mr-3 rounded-[6px] border border-line-strong px-1.5 type-small text-secondary">N</kbd> : null}
              </button>

              {toBuy.length ? (
                <>
                  <h2 className="type-body-strong text-ink">
                    {liveTrip ? 'Still to buy' : 'To buy'} · {toBuy.length}
                  </h2>
                  <div className="overflow-hidden rounded-20 border border-line bg-surface">
                    <VirtualRows items={toBuy} rowHeight={ROW_H} getKey={(i) => i.id} render={(i, idx) => row(i, idx, toBuy)} />
                  </div>
                </>
              ) : (
                <p className="rounded-20 bg-muted px-4 py-5 text-center type-body text-body">Everything&rsquo;s in the bag. Nice one.</p>
              )}

              {purchased.length ? (
                <>
                  <button
                    type="button"
                    aria-expanded={showPurchased}
                    onClick={() => setShowPurchased((s) => !s)}
                    className="focus-ring -mx-1 flex min-h-11 items-center justify-between rounded-12 px-1 text-left"
                  >
                    <h2 className="type-body-strong text-ink">
                      {liveTrip ? 'Just bought' : 'Purchased'} · {purchased.length}
                    </h2>
                    <Icon name="chevron-down" size={18} className={cn('transition-transform', showPurchased && 'rotate-180')} />
                  </button>
                  {showPurchased ? (
                    <div className="overflow-hidden rounded-20 border border-line bg-surface">
                      <VirtualRows items={purchased} rowHeight={ROW_H} getKey={(i) => i.id} render={(i, idx) => row(i, idx, purchased)} />
                    </div>
                  ) : null}
                </>
              ) : null}
            </>
          )}
        </section>
      </div>

      {pane ? <ItemPanel itemId={panelItemId} /> : null}
    </div>
  );
}

/** W6: desktop item edit beside the list. */
function ItemPanel({ itemId }: { itemId: string | null }) {
  const item = useItem(itemId);
  return (
    <SidePanel open={Boolean(itemId && item)} onClose={closeSheet} title="Edit item" className="sticky top-0 h-dvh">
      {item ? <ItemEditor key={item.id} mode="edit" item={item} onDone={closeSheet} /> : null}
    </SidePanel>
  );
}
