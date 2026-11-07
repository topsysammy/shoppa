import { Avatar } from '@/components/Avatar';
import { ProgressBar } from '@/components/ProgressBar';
import type { ListStats } from '@/features/lists/data';
import type { LiveTrip } from './trip';

function since(iso: string): string {
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  return m < 1 ? 'just now' : m === 1 ? '1 min ago' : m < 60 ? `${m} min ago` : `${Math.floor(m / 60)} h ago`;
}

/**
 * Screen 37 Owner watches progress: shown on list details while another
 * member is in Shopping Mode. Ticks arrive over realtime (sync rule 6).
 * Member names come with sharing in phase 5; until then it says "Someone".
 */
export function LiveTripCard({ trip, stats, name = 'Someone' }: { trip: LiveTrip; stats: ListStats; name?: string }) {
  return (
    <section aria-live="polite" aria-label="Live shopping trip" className="flex flex-col gap-3.5 rounded-[22px] bg-brand-strong p-4 text-on-brand">
      <div className="flex items-center gap-3">
        <Avatar size={36} name={name} tone="lavender" />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate type-body-strong">{name} is shopping now</span>
          <span className="type-caption opacity-90">Started {since(trip.startedAt)} · live</span>
        </div>
        <span className="type-small-strong">
          {stats.purchased} / {stats.total}
        </span>
      </div>
      <ProgressBar tone="onBrand" value={stats.total ? stats.purchased / stats.total : 0} label="Trip progress" />
    </section>
  );
}
