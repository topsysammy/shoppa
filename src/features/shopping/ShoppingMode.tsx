import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/Button';
import { IconButton } from '@/components/IconButton';
import { Icon } from '@/components/icons/Icon';
import { Modal } from '@/components/Modal';
import { ProgressBar } from '@/components/ProgressBar';
import { ShopItem } from '@/components/ShopItem';
import { VirtualRows } from '@/components/VirtualRows';
import { db } from '@/db/schema';
import { useLiveQuery } from '@/db/useLiveQuery';
import { resetForNextTime, setPurchased } from '@/db/repo';
import { cn } from '@/lib/cn';
import { formatQuantity } from '@/lib/units';
import { useOnline } from '@/lib/useOnline';
import { showToast } from '@/features/shell/toasts';
import { statsOf, useItems, useList } from '@/features/lists/data';
import { EmptyState } from '@/features/lists/EmptyState';
import { getSyncStatus, subscribeSync } from '@/sync/engine';
import { finishTrip, startTrip, type TripSummary } from './trip';
import { useWakeLock } from './useWakeLock';
import { usePrefs } from '@/lib/prefs';

/** 80px row + 12px gap (PRD principle 2). */
const ROW_H = 92;

/**
 * Screens 33 Shopping Mode, 34 almost done, 35 offline and 36 Shopping
 * complete. Full screen at every width (PRD section 5), works fully offline,
 * and keeps the screen awake (S1).
 */
export function ShoppingMode() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const list = useList(id);
  const items = useItems(id);
  const online = useOnline();
  const sync = useSyncExternalStore(subscribeSync, getSyncStatus);
  const pending = useLiveQuery(() => db.outbox.count(), []) ?? 0;
  const [summary, setSummary] = useState<TripSummary | null>(null);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const prefs = usePrefs();
  // S1 (Appearance > Keep screen on while shopping can turn it off on this device).
  const wake = useWakeLock(!summary && prefs.keepAwake);
  const [tipHidden, setTipHidden] = useState(false);
  // Only a tick made in this trip finishes it (opening a done list doesn't).
  const ticked = useRef(false);

  useEffect(() => {
    if (list) void startTrip(list.id);
  }, [list?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const stats = items ? statsOf(items) : null;

  // W7: Esc leaves Shopping Mode (dialogs handle their own Esc first).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || summary || confirmEnd || document.querySelector('dialog[open]')) return;
      navigate(`/lists/${id}`, { replace: true });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [summary, confirmEnd, id, navigate]);

  // Screen 36: the last tick finishes the trip.
  useEffect(() => {
    if (!list || !stats || summary || stats.total === 0 || !ticked.current) return;
    if (stats.remaining === 0) {
      navigator.vibrate?.([20, 40, 20]);
      void finishTrip(list.id, stats.purchased, stats.total).then(setSummary);
    }
  }, [stats?.remaining, stats?.total]); // eslint-disable-line react-hooks/exhaustive-deps

  if (list === undefined || items === undefined || !stats) return <div className="min-h-dvh canvas-gradient" aria-busy="true" />;
  if (list === null || list.deletedAt) {
    return (
      <div className="flex min-h-dvh flex-col canvas-gradient">
        <EmptyState icon="list" title="This list isn’t available" body="It may have been deleted, or you no longer have access to it.">
          <Button fullWidth={false} onClick={() => navigate('/lists')}>
            Go to my lists
          </Button>
        </EmptyState>
      </div>
    );
  }

  if (summary) {
    return (
      <TripComplete
        title={list.title}
        summary={summary}
        onDone={() => navigate(`/lists/${list.id}`, { replace: true })}
        onReuse={async () => {
          await resetForNextTime(list.id);
          showToast({ icon: 'refresh', message: `${list.title} is ready for next time` });
          navigate(`/lists/${list.id}`, { replace: true });
        }}
      />
    );
  }

  const toBuy = items.filter((i) => !i.purchasedAt).sort((a, b) => a.position - b.position);
  const inBag = items.filter((i) => i.purchasedAt).sort((a, b) => (b.purchasedAt! > a.purchasedAt! ? 1 : -1));
  const status = !online ? 'offline' : sync.state === 'syncing' || pending > 0 ? 'syncing' : 'synced';

  const tick = (itemId: string, purchased: boolean) => {
    ticked.current = true;
    navigator.vibrate?.(10);
    void setPurchased(itemId, purchased);
  };

  const leave = () => {
    if (stats.purchased > 0 && stats.remaining > 0) setConfirmEnd(true);
    else navigate(`/lists/${list.id}`, { replace: true });
  };

  const endEarly = async () => {
    setConfirmEnd(false);
    setSummary(await finishTrip(list.id, stats.purchased, stats.total));
  };

  return (
    <div className={cn('flex min-h-dvh flex-col items-center canvas-gradient', prefs.largeShopText && 'shop-large')}>
      <div className="flex w-full max-w-[640px] flex-1 flex-col">
        <header className="flex items-center gap-3 px-5 pt-[max(20px,env(safe-area-inset-top))]">
          <IconButton icon="close" label="Leave Shopping Mode" onClick={leave} />
          <div className="flex min-w-0 flex-1 flex-col items-center text-center">
            <h1 className="w-full truncate type-heading text-ink">{list.title}</h1>
            <p className="flex items-center gap-1.5 type-caption text-secondary" role="status" aria-live="polite">
              <span
                aria-hidden
                className={cn('size-[7px] rounded-full', status === 'offline' ? 'bg-alert' : status === 'syncing' ? 'bg-yellow' : 'bg-brand')}
              />
              Shopping Mode · {status}
              {status === 'offline' && pending ? ` · ${pending} to sync` : ''}
            </p>
          </div>
          <span className="size-11 shrink-0" aria-hidden />
        </header>

        <div className="px-5 pt-[18px]">
          <section aria-label="Trip progress" className="flex flex-col gap-3.5 rounded-[22px] bg-brand-strong p-[18px] text-on-brand">
            <div className="flex items-end">
              <div className="flex flex-1 flex-col gap-0.5">
                <span className="text-[42px] font-bold leading-[44px] tracking-[-1px]" aria-hidden>
                  {stats.remaining}
                </span>
                <span className="type-small opacity-90">
                  <span className="sr-only">{stats.remaining} </span>
                  {stats.remaining === 1 ? 'item remaining' : 'items remaining'}
                </span>
              </div>
              <span className="rounded-full bg-black/15 px-3 py-1.5 type-small-strong">
                {stats.purchased} / {stats.total} done
              </span>
            </div>
            <ProgressBar tone="onBrand" value={stats.total ? stats.purchased / stats.total : 0} label="Trip progress" />
          </section>
        </div>

        {prefs.keepAwake && (wake === 'unsupported' || wake === 'denied') ? (
          tipHidden ? null : (
            <p className="mx-5 mt-3 flex items-center gap-2 rounded-16 bg-surface px-3.5 py-2.5 type-caption text-body">
              <Icon name="clock" size={18} className="shrink-0" />
              <span className="flex-1">Tip: raise your screen timeout in phone settings so the list stays on while you shop.</span>
              <IconButton variant="ghost" icon="close" label="Hide tip" onClick={() => setTipHidden(true)} className="-my-2 -mr-2" />
            </p>
          )
        ) : null}

        <main className="mt-[18px] flex flex-1 flex-col rounded-t-32 bg-surface px-5 pb-[calc(140px+env(safe-area-inset-bottom))] pt-[22px]">
          {stats.total === 0 ? (
            <EmptyState icon="bag" title="Nothing to buy" body="Add items to this list first, then come back to shop.">
              <Button fullWidth={false} onClick={() => navigate(`/lists/${list.id}`)}>
                Back to list
              </Button>
            </EmptyState>
          ) : (
            <>
              <h2 className="sr-only">To buy · {toBuy.length}</h2>
              <VirtualRows
                items={toBuy}
                rowHeight={ROW_H}
                getKey={(i) => i.id}
                render={(i) => (
                  <div className="pb-3">
                    <ShopItem
                      name={i.name}
                      detail={[formatQuantity(i.quantity, i.unit), i.note].filter(Boolean).join(' · ') || undefined}
                      checked={false}
                      onToggle={() => tick(i.id, true)}
                    />
                  </div>
                )}
              />
              {inBag.length ? (
                <>
                  <h2 className="pb-3 pt-1 type-body-strong text-ink">In the bag · {inBag.length}</h2>
                  <VirtualRows
                    items={inBag}
                    rowHeight={ROW_H}
                    getKey={(i) => i.id}
                    render={(i) => {
                      const q = formatQuantity(i.quantity, i.unit);
                      return (
                        <div className="pb-3">
                          <ShopItem name={i.name} checkedLabel={q ? `${i.name} · ${q}` : i.name} checked onToggle={() => tick(i.id, false)} />
                        </div>
                      );
                    }}
                  />
                </>
              ) : null}
            </>
          )}
        </main>
      </div>

      {stats.total > 0 ? (
        <div className="fixed inset-x-0 bottom-0 z-20 flex justify-center bg-gradient-to-b from-transparent via-surface via-35% to-surface px-5 pb-[max(34px,env(safe-area-inset-bottom))] pt-5">
          <div className="w-full max-w-[600px]">
            <Button variant="secondary" onClick={() => (stats.purchased ? setConfirmEnd(true) : navigate(`/lists/${list.id}`))}>
              {stats.purchased ? 'End trip early' : 'Leave Shopping Mode'}
            </Button>
          </div>
        </div>
      ) : null}

      <Modal open={confirmEnd} onClose={() => setConfirmEnd(false)} variant="dialog" size="sm" title="End this trip?">
        <div className="flex flex-col gap-4">
          <p className="type-body text-body">
            {stats.remaining} {stats.remaining === 1 ? 'item is' : 'items are'} still on the list. They&rsquo;ll stay there for next time.
          </p>
          <div className="flex flex-col gap-2.5">
            <Button onClick={() => void endEarly()}>End trip</Button>
            <Button variant="secondary" onClick={() => setConfirmEnd(false)}>
              Keep shopping
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/** Screen 36 Shopping complete (also shown after ending early). */
function TripComplete({ title, summary, onDone, onReuse }: { title: string; summary: TripSummary; onDone: () => void; onReuse: () => void }) {
  return (
    <div className="flex min-h-dvh flex-col items-center canvas-gradient">
      <main className="flex w-full max-w-[440px] flex-1 flex-col gap-3 px-5 pb-[max(34px,env(safe-area-inset-bottom))] pt-[max(52px,env(safe-area-inset-top))]">
        <div className="flex flex-1 flex-col items-center justify-center gap-3.5 text-center" role="status">
          <span className="inline-flex size-[168px] items-center justify-center rounded-full bg-halo-strong/60" aria-hidden>
            <span className="inline-flex size-[136px] items-center justify-center rounded-full bg-halo-strong">
              <span className="inline-flex size-[108px] items-center justify-center rounded-full bg-brand-strong text-white">
                <Icon name="check" size={52} strokeWidth={1.3} />
              </span>
            </span>
          </span>
          <h1 className="mt-[22px] type-display text-ink">{summary.early ? 'Trip ended' : 'Shopping complete'}</h1>
          <p className="type-body text-secondary">
            {summary.early ? `${summary.total - summary.bought} left on ${title} for next time.` : `Everything on ${title} is in the bag.`}
          </p>
          <div className="mt-1 flex w-full gap-2.5">
            <Stat icon="bag" tint="bg-avatar-mint text-avatar-mint-text" value={`${summary.bought} / ${summary.total}`} label="items bought" />
            <Stat icon="clock" tint="bg-avatar-peach text-avatar-peach-text" value={`${summary.minutes} min`} label="at the market" />
          </div>
        </div>
        <Button onClick={onDone}>Done</Button>
        <Button variant="secondary" onClick={onReuse}>
          Reuse this list next time
        </Button>
      </main>
    </div>
  );
}

function Stat({ icon, tint, value, label }: { icon: 'bag' | 'clock'; tint: string; value: string; label: string }) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-3 rounded-20 border border-line bg-surface p-3.5 text-left">
      <span className={cn('inline-flex size-9 shrink-0 items-center justify-center rounded-full', tint)}>
        <Icon name={icon} size={18} />
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="type-body-strong text-ink">{value}</span>
        <span className="type-small text-secondary">{label}</span>
      </span>
    </div>
  );
}
