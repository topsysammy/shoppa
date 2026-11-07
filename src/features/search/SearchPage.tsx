import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Checkbox } from '@/components/Checkbox';
import { Chip } from '@/components/Chip';
import { IconButton } from '@/components/IconButton';
import { Icon } from '@/components/icons/Icon';
import { ListCard } from '@/components/ListCard';
import { TopBar } from '@/components/TopBar';
import { db, type ListKind } from '@/db/schema';
import { useLiveQuery } from '@/db/useLiveQuery';
import { cn } from '@/lib/cn';
import { local } from '@/lib/storage';
import { formatQuantity } from '@/lib/units';
import { isCompleted, statusOf, useListSummaries, type ListSummary } from '@/features/lists/data';
import { EmptyState } from '@/features/lists/EmptyState';
import { iconFor } from '@/features/lists/listMeta';
import { togglePurchased } from '@/features/lists/actions';
import { openSheet } from '@/features/lists/sheetStore';
import { personOf, usePeople } from '@/features/sharing/people';
import { useUnreadCount } from '@/features/notifications/data';

type Scope = 'all' | 'items' | 'lists';
type Facet = ListKind | 'shared' | 'completed';
const facets: Array<{ id: Facet; label: string }> = [
  { id: 'groceries', label: 'Groceries' },
  { id: 'household', label: 'Household' },
  { id: 'shared', label: 'Shared' },
  { id: 'party', label: 'Party' },
  { id: 'business', label: 'Shop stock' },
  { id: 'completed', label: 'Completed' },
];
const RECENT_KEY = 'shoppa.recentSearches';

const norm = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').trim();

function Highlight({ text, q }: { text: string; q: string }) {
  const i = norm(text).indexOf(q);
  if (!q || i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <mark className="rounded-[4px] bg-match px-0.5 text-ink">{text.slice(i, i + q.length)}</mark>
      {text.slice(i + q.length)}
    </>
  );
}

/**
 * Screens 48 Search, 49 Search results and 50 No results. Searches lists and
 * items on the device, so it works offline. "/" opens it from anywhere (W7).
 */
export function SearchPage() {
  const navigate = useNavigate();
  const people = usePeople();
  const unread = useUnreadCount();
  const summaries = useListSummaries();
  const items = useLiveQuery(async () => (await db.items.toArray()).filter((i) => !i.deletedAt), []);
  const [text, setText] = useState('');
  const [scope, setScope] = useState<Scope>('all');
  const [facet, setFacet] = useState<Facet | null>(null);
  const [recent, setRecent] = useState<string[]>(() => {
    try {
      return JSON.parse(local.get(RECENT_KEY) ?? '[]') as string[];
    } catch {
      return [];
    }
  });
  const inputRef = useRef<HTMLInputElement>(null);
  const q = norm(text);

  useEffect(() => inputRef.current?.focus(), []);

  const byId = useMemo(() => new Map((summaries ?? []).map((s) => [s.list.id, s])), [summaries]);
  const facetOk = (s: ListSummary | undefined) => {
    if (!s) return false;
    if (!facet) return true;
    if (facet === 'shared') return s.members.length > 1;
    if (facet === 'completed') return isCompleted(s.stats);
    return s.list.kind === facet;
  };

  const listHits = (summaries ?? []).filter((s) => facetOk(s) && (!q || norm(s.list.title).includes(q) || norm(s.list.note).includes(q)));
  const itemHits = (items ?? [])
    .filter((i) => facetOk(byId.get(i.listId)) && q && (norm(i.name).includes(q) || norm(i.note).includes(q)))
    .sort((a, b) => Number(Boolean(a.purchasedAt)) - Number(Boolean(b.purchasedAt)) || a.name.localeCompare(b.name));
  const searching = q.length > 0 || facet !== null;
  const total = (q ? itemHits.length : 0) + listHits.length;

  const remember = () => {
    if (!q) return;
    const next = [text.trim(), ...recent.filter((r) => norm(r) !== q)].slice(0, 5);
    setRecent(next);
    local.set(RECENT_KEY, JSON.stringify(next));
  };

  const recentSummary = (term: string) => {
    const t = norm(term);
    const its = (items ?? []).filter((i) => norm(i.name).includes(t));
    const ls = new Set(its.map((i) => byId.get(i.listId)?.list.title).filter(Boolean));
    if (its.length) return `${its.length} ${its.length === 1 ? 'item' : 'items'} · ${[...ls].join(', ')}`;
    const lists = (summaries ?? []).filter((s) => norm(s.list.title).includes(t));
    return lists.length ? `${lists.length} ${lists.length === 1 ? 'list' : 'lists'} · ${lists.map((s) => s.list.title).join(', ')}` : 'No matches now';
  };

  return (
    <div className="flex min-h-[calc(100dvh-96px)] flex-col desktop:mx-auto desktop:min-h-dvh desktop:w-full desktop:max-w-[720px]">
      <TopBar
        title="Search"
        left={{ icon: 'back', label: 'Back', onClick: () => navigate(-1) }}
        right={{ icon: 'bell', label: unread ? `Notifications, ${unread} unread` : 'Notifications', dot: unread > 0, onClick: () => navigate('/notifications') }}
      />
      <section className="mt-[18px] flex flex-1 flex-col gap-3.5 rounded-t-32 bg-surface px-5 pb-8 pt-5 desktop:rounded-32">
        <form
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            remember();
            inputRef.current?.blur();
          }}
          className="flex h-[52px] items-center gap-2.5 rounded-full border-[1.5px] border-line-focus bg-surface pl-4 pr-1.5"
        >
          <Icon name="search" size={20} className="shrink-0 text-ink" />
          <label htmlFor="search-input" className="sr-only">
            Search lists or items
          </label>
          <input
            id="search-input"
            ref={inputRef}
            type="search"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onBlur={remember}
            placeholder="Search lists or items"
            autoComplete="off"
            enterKeyHint="search"
            className="h-full min-w-0 flex-1 bg-transparent type-body text-ink placeholder:text-tertiary focus:outline-none [&::-webkit-search-cancel-button]:hidden"
          />
          {text ? <IconButton variant="ghost" icon="close" label="Clear search" onClick={() => (setText(''), inputRef.current?.focus())} className="bg-muted" /> : null}
        </form>

        {q ? (
          <div className="flex gap-2" role="tablist" aria-label="Result type">
            {(
              [
                ['all', `All · ${total}`],
                ['items', `Items · ${itemHits.length}`],
                ['lists', `Lists · ${listHits.length}`],
              ] as Array<[Scope, string]>
            ).map(([id, label]) => (
              <Chip key={id} label={label} role="tab" aria-selected={scope === id} aria-pressed={undefined} state={scope === id ? 'active' : 'default'} onClick={() => setScope(id)} />
            ))}
          </div>
        ) : (
          <div className="flex flex-wrap gap-2" role="toolbar" aria-label="Filter by">
            {facets.map((f) => (
              <Chip key={f.id} label={f.label} state={facet === f.id ? 'active' : 'outline'} onClick={() => setFacet(facet === f.id ? null : f.id)} />
            ))}
          </div>
        )}

        {!searching ? (
          recent.length ? (
            <>
              <h2 className="pt-1 type-body-strong text-ink">Recent search</h2>
              <ul className="flex flex-col gap-2.5">
                {recent.map((r) => (
                  <li key={r}>
                    <button type="button" onClick={() => setText(r)} className="focus-ring flex w-full flex-col gap-0.5 rounded-16 border border-line bg-surface px-4 py-3.5 text-left shadow-card hover:bg-muted">
                      <span className="type-body-strong text-ink">{r}</span>
                      <span className="truncate type-caption text-secondary">{recentSummary(r)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="py-6 text-center type-body text-secondary">Find any item or list, even offline.</p>
          )
        ) : total === 0 && q ? (
          <EmptyState icon="search" title={`No results for “${text.trim()}”`} body="It’s not on any of your lists yet.">
            <Button fullWidth={false} icon="plus" onClick={() => openSheet({ kind: 'quickAdd', text: text.trim() })}>
              Add “{text.trim()}” to a list
            </Button>
          </EmptyState>
        ) : (
          <div className="flex flex-col gap-3" aria-live="polite">
            {q && scope !== 'lists'
              ? itemHits.slice(0, 100).map((i) => {
                  const s = byId.get(i.listId);
                  if (!s) return null;
                  const shared = s.members.length > 1;
                  return (
                    <div key={i.id} className="flex flex-col gap-2 rounded-20 border border-line bg-surface p-4 shadow-card">
                      <button
                        type="button"
                        onClick={() => navigate(`/lists/${s.list.id}`)}
                        className="focus-ring flex items-center gap-1.5 self-start rounded-[6px] type-small text-secondary"
                      >
                        <Icon name={shared ? 'users' : iconFor(s.list.icon)} size={14} />
                        {s.list.title}
                        {shared ? ' · shared' : ''}
                      </button>
                      <div className="flex items-center gap-3.5">
                        <Checkbox
                          checked={Boolean(i.purchasedAt)}
                          onChange={(v) => void togglePurchased(i, v)}
                          label={i.purchasedAt ? `Mark ${i.name} as not purchased` : `Mark ${i.name} as purchased`}
                        />
                        <button type="button" onClick={() => navigate(`/lists/${s.list.id}`)} className="focus-ring flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-12 text-left">
                          <span className={cn('min-w-0 flex-1 truncate type-body-strong', i.purchasedAt ? 'text-tertiary line-through' : 'text-ink')}>
                            <Highlight text={i.name} q={q} />
                          </span>
                          {i.purchasedAt ? (
                            <Badge label="Bought" tone="done" />
                          ) : (
                            <span className="shrink-0 text-[14px] font-medium text-body">{formatQuantity(i.quantity, i.unit)}</span>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })
              : null}
            {scope !== 'items'
              ? listHits.map((s) => (
                  <ListCard
                    key={s.list.id}
                    title={s.list.title}
                    status={statusOf(s.stats)}
                    members={s.members.map((m) => personOf(people, m.userId))}
                    itemCount={s.stats.total}
                    noteCount={s.stats.notes}
                    progress={s.stats.total ? s.stats.purchased / s.stats.total : 0}
                    onOpen={() => {
                      remember();
                      navigate(`/lists/${s.list.id}`);
                    }}
                  />
                ))
              : null}
          </div>
        )}
      </section>
    </div>
  );
}
