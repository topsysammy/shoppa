import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { IconButton } from '@/components/IconButton';
import { useIsDesktop } from '@/lib/useMedia';
import { isCompleted, useListSummaries } from './data';
import { EmptyState } from './EmptyState';
import { SummaryCard } from './HomePage';
import { ListDetail } from './ListDetail';
import { openSheet } from './sheetStore';

type ListsFilter = 'all' | 'active' | 'groceries' | 'completed';
const filters: Array<{ id: ListsFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'groceries', label: 'Groceries' },
  { id: 'completed', label: 'Completed' },
];

/**
 * Screens 18 Lists tab and 19 Lists · empty.
 * W6 desktop: lists in the left pane, the selected list's details on the right.
 */
export function ListsPage() {
  const { id } = useParams();
  const desktop = useIsDesktop();
  if (desktop) {
    return (
      <div className="flex h-dvh">
        <div className="w-[380px] shrink-0 overflow-y-auto border-r border-line">
          <ListsColumn selectedId={id} />
        </div>
        <div className="min-w-0 flex-1 overflow-y-auto">
          {id ? (
            <ListDetail key={id} listId={id} pane />
          ) : (
            <EmptyState icon="list" title="Pick a list" body="Choose a list on the left, or press L to create one." />
          )}
        </div>
      </div>
    );
  }
  return id ? <ListDetail key={id} listId={id} /> : <ListsColumn />;
}

function ListsColumn({ selectedId }: { selectedId?: string }) {
  const navigate = useNavigate();
  const summaries = useListSummaries();
  const [filter, setFilter] = useState<ListsFilter>('all');
  const shown = (summaries ?? []).filter((s) =>
    filter === 'all'
      ? true
      : filter === 'active'
        ? !isCompleted(s.stats)
        : filter === 'completed'
          ? isCompleted(s.stats)
          : s.list.kind === 'groceries',
  );

  return (
    <div className="flex min-h-[calc(100dvh-96px)] flex-col desktop:min-h-full">
      <header className="flex items-center gap-3 px-5 pt-[max(20px,env(safe-area-inset-top))] desktop:pt-6">
        <span className="size-11 shrink-0" aria-hidden />
        <h1 className="flex-1 text-center type-title text-ink">My Lists</h1>
        <IconButton icon="search" label="Search" onClick={() => navigate('/search')} />
      </header>
      <section className="mt-[18px] flex flex-1 flex-col gap-3 rounded-t-32 bg-surface px-5 pb-6 pt-5">
        {summaries === undefined ? null : summaries.length === 0 ? (
          <EmptyState icon="list" title="Nothing to shop for yet." body="Create your first shopping list and start adding things as you remember them.">
            <Button fullWidth={false} onClick={() => openSheet({ kind: 'createList' })}>
              Create a List
            </Button>
          </EmptyState>
        ) : (
          <>
            <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none]" role="toolbar" aria-label="Filter lists">
              {filters.map((f) => (
                <Chip key={f.id} label={f.label} state={filter === f.id ? 'selected' : 'default'} onClick={() => setFilter(f.id)} />
              ))}
            </div>
            {shown.length ? (
              shown.map((s) => <SummaryCard key={s.list.id} s={s} selected={s.list.id === selectedId} />)
            ) : (
              <p className="py-8 text-center type-body text-secondary">No lists match this filter.</p>
            )}
          </>
        )}
      </section>
    </div>
  );
}
