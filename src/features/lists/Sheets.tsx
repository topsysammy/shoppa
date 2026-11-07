import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ActionRow } from '@/components/ActionRow';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { Icon } from '@/components/icons/Icon';
import { Input } from '@/components/Input';
import { ShortcutList } from '@/components/Kbd';
import { Modal } from '@/components/Modal';
import { Stepper } from '@/components/Stepper';
import { cn } from '@/lib/cn';
import { formatQuantity, quickFor, stepFor, unitChipLabel } from '@/lib/units';
import { useIsDesktop } from '@/lib/useMedia';
import type { ListIcon, ListKind } from '@/db/schema';
import { addItem, createList, deleteList, moveItem, updateItem, updateList } from '@/db/repo';
import { showToast } from '@/features/shell/toasts';
import { currentUserId } from '@/sync/currentUser';
import { clearPurchasedWithUndo, deleteWithUndo, togglePurchased, uncheckAllWithUndo } from './actions';
import { pickDefaultList, useItem, useItems, useList, useListSummaries, useMyProfile, useRecentItems } from './data';
import { ItemEditor } from './ItemEditor';
import { listIcons, listKinds } from './listMeta';
import { closeSheet, openSheet, useSheet } from './sheetStore';
import { UnitPicker } from './UnitPicker';
import { ShareSheet } from '@/features/sharing/ShareSheet';
import { PushPrompt } from '@/features/notifications/PushPrompt';

/** Renders whichever sheet is open. Mounted once in the app shell. */
export function Sheets() {
  const sheet = useSheet();
  const desktop = useIsDesktop();
  const { pathname } = useLocation();
  // W6: on desktop list pages, item edit opens in the side panel instead.
  const editInPanel = desktop && pathname.startsWith('/lists/') && sheet.kind === 'editItem';
  return (
    <>
      <AddMenuSheet open={sheet.kind === 'addMenu'} />
      <JoinDialog open={sheet.kind === 'join'} />
      <Modal open={sheet.kind === 'shortcuts'} onClose={closeSheet} variant="dialog" title="Keyboard shortcuts">
        <ShortcutList />
      </Modal>
      <ListFormSheet open={sheet.kind === 'createList' || sheet.kind === 'editList'} listId={sheet.kind === 'editList' ? sheet.listId : undefined} />
      <RenameListDialog listId={sheet.kind === 'renameList' ? sheet.listId : undefined} />
      <DeleteListDialog listId={sheet.kind === 'deleteList' ? sheet.listId : undefined} />
      <ListOptionsSheet listId={sheet.kind === 'listOptions' ? sheet.listId : undefined} />
      <ShareSheet listId={sheet.kind === 'share' ? sheet.listId : undefined} />
      <PushPrompt open={sheet.kind === 'pushPrompt'} reason={sheet.kind === 'pushPrompt' ? sheet.reason : undefined} />
      <QuickAddSheet open={sheet.kind === 'quickAdd'} listId={sheet.kind === 'quickAdd' ? sheet.listId : undefined} text={sheet.kind === 'quickAdd' ? sheet.text : undefined} />
      <Modal open={sheet.kind === 'addItem'} onClose={closeSheet} title="Add new item">
        {sheet.kind === 'addItem' ? <ItemEditor mode="add" listId={sheet.listId} onDone={closeSheet} /> : null}
      </Modal>
      {!editInPanel ? <EditItemSheet itemId={sheet.kind === 'editItem' ? sheet.itemId : undefined} focus={sheet.kind === 'editItem' ? sheet.focus : undefined} /> : null}
      <ItemActionsSheet itemId={sheet.kind === 'itemActions' ? sheet.itemId : undefined} />
      <MoveItemSheet itemId={sheet.kind === 'moveItem' ? sheet.itemId : undefined} />
    </>
  );
}

// 16 + Add menu ------------------------------------------------------------------

function AddMenuSheet({ open }: { open: boolean }) {
  const summaries = useListSummaries();
  const profile = useMyProfile();
  const target = pickDefaultList(summaries, profile);
  return (
    <Modal open={open} onClose={closeSheet} title="Add something" size="sm">
      <div className="flex flex-col gap-3 pt-1">
        <ActionRow
          variant="card"
          icon="plus"
          iconBg="bg-brand-strong text-white"
          label="Add an item"
          description={target ? `Drop it into ${target.title}` : 'Create a list first'}
          disabled={!target}
          onClick={() => target && openSheet({ kind: 'quickAdd', listId: target.id })}
        />
        <ActionRow
          variant="card"
          icon="list"
          iconBg="bg-avatar-mint text-avatar-mint-text"
          label="Create a list"
          description="Groceries, house supplies, a party…"
          onClick={() => openSheet({ kind: 'createList' })}
        />
        <ActionRow
          variant="card"
          icon="link"
          iconBg="bg-avatar-lavender text-avatar-lavender-text"
          label="Join a shared list"
          description="Paste an invite link"
          onClick={() => openSheet({ kind: 'join' })}
        />
      </div>
    </Modal>
  );
}

/** Join a shared list by pasting the invite link (the join flow itself is phase 5). */
function JoinDialog({ open }: { open: boolean }) {
  const navigate = useNavigate();
  const [link, setLink] = useState('');
  const [error, setError] = useState('');
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const m = link.trim().match(/(?:\/join\/)?([A-Za-z0-9_-]{8,})\/?$/);
    if (!m) return setError('Paste the whole invite link, e.g. shoppa.app/join/…');
    closeSheet();
    setLink('');
    navigate(`/join/${m[1]}`);
  };
  return (
    <Modal open={open} onClose={closeSheet} title="Join a shared list" variant="dialog" size="sm">
      <form onSubmit={submit} className="flex flex-col gap-4 pt-2" noValidate>
        <Input label="Invite link" value={link} onChange={(e) => setLink(e.target.value)} placeholder="shoppa.app/join/…" error={error || undefined} autoCapitalize="none" inputMode="url" />
        <Button type="submit">Open invite</Button>
      </form>
    </Modal>
  );
}

// 20 Create list / Edit icon & description -----------------------------------------

function ListFormSheet({ open, listId }: { open: boolean; listId?: string }) {
  const navigate = useNavigate();
  const existing = useList(listId);
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [kind, setKind] = useState<ListKind>('groceries');
  const [icon, setIcon] = useState<ListIcon>('bag');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setTitle(existing?.title ?? '');
    setNote(existing?.note ?? '');
    setKind(existing?.kind ?? 'groceries');
    setIcon(existing?.icon ?? 'bag');
    setError('');
  }, [open, existing]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return setError('Give your list a name.');
    if (existing) {
      await updateList(existing.id, { title, note, kind, icon });
      closeSheet();
    } else {
      const list = await createList({ title, note, kind, icon });
      closeSheet();
      navigate(`/lists/${list.id}`);
    }
  };

  return (
    <Modal
      open={open}
      onClose={closeSheet}
      title={existing ? 'Edit icon & description' : 'Create new list'}
      footer={
        <Button type="submit" form="list-form">
          {existing ? 'Save changes' : 'Create list'}
        </Button>
      }
    >
      <form id="list-form" onSubmit={submit} noValidate className="flex flex-col gap-[18px] pt-1">
        <Input label="List name" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Weekly Groceries" maxLength={80} error={error || undefined} autoFocus />
        <label className="flex flex-col gap-2">
          <span className="type-label text-body">
            Description <span className="font-normal text-secondary">(optional)</span>
          </span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={500}
            rows={3}
            placeholder="Things we need for the house"
            className="min-h-[88px] resize-none rounded-12 border border-line-strong bg-surface px-4 py-3.5 type-body text-ink placeholder:text-tertiary focus:border-[1.5px] focus:border-line-focus focus:outline-none"
          />
        </label>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 type-label text-body">Type</legend>
          <div className="flex flex-wrap gap-2">
            {listKinds.map((k) => (
              <Chip key={k.id} label={k.label} state={kind === k.id ? 'active' : 'outline'} onClick={() => setKind(k.id)} />
            ))}
          </div>
        </fieldset>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 type-label text-body">
            Icon <span className="font-normal text-secondary">(optional)</span>
          </legend>
          <div className="flex flex-wrap gap-2.5" role="radiogroup" aria-label="List icon">
            {listIcons.map((i) => (
              <button
                key={i.id}
                type="button"
                role="radio"
                aria-checked={icon === i.id}
                aria-label={i.label}
                onClick={() => setIcon(i.id)}
                className={cn(
                  'focus-ring inline-flex size-[50px] items-center justify-center rounded-full',
                  icon === i.id ? 'bg-brand-strong text-white' : 'border border-line-strong bg-surface text-ink hover:bg-muted',
                )}
              >
                <Icon name={i.icon} size={20} />
              </button>
            ))}
          </div>
        </fieldset>
      </form>
    </Modal>
  );
}

// 24 Rename list -------------------------------------------------------------------

function RenameListDialog({ listId }: { listId?: string }) {
  const list = useList(listId);
  const [title, setTitle] = useState('');
  useEffect(() => setTitle(list?.title ?? ''), [list]);
  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!list || !title.trim()) return;
    await updateList(list.id, { title });
    closeSheet();
  };
  return (
    <Modal open={Boolean(listId)} onClose={closeSheet} title="Rename list" variant="dialog" size="sm">
      <form onSubmit={save} className="flex flex-col gap-4 pt-1">
        <Input label="List name" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} autoFocus />
        <div className="flex gap-2.5">
          <Button variant="secondary" onClick={closeSheet}>
            Cancel
          </Button>
          <Button type="submit" disabled={!title.trim()}>
            Save
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// 25 Delete list ---------------------------------------------------------------------

function DeleteListDialog({ listId }: { listId?: string }) {
  const navigate = useNavigate();
  const list = useList(listId);
  const items = useItems(listId);
  const remove = async () => {
    if (!list) return;
    await deleteList(list.id);
    closeSheet();
    navigate('/lists', { replace: true });
    showToast({ icon: 'trash', message: `“${list.title}” deleted` });
  };
  const count = items?.length ?? 0;
  return (
    <Modal open={Boolean(listId)} onClose={closeSheet} title="Delete list" variant="dialog" size="sm">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="inline-flex size-14 items-center justify-center rounded-full bg-danger-tint text-danger">
          <Icon name="trash" size={24} />
        </span>
        <p className="type-title text-ink">Delete “{list?.title}”?</p>
        <p className="type-caption text-secondary">
          This removes the list and all {count} {count === 1 ? 'item' : 'items'}. If it&rsquo;s shared, it will disappear for everyone too. This
          can&rsquo;t be undone.
        </p>
        <div className="mt-2 flex w-full flex-col gap-2.5">
          <Button variant="danger" onClick={remove}>
            Delete list
          </Button>
          <Button variant="secondary" onClick={closeSheet}>
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// 23 List options ------------------------------------------------------------------

function ListOptionsSheet({ listId }: { listId?: string }) {
  const list = useList(listId);
  const navigate = useNavigate();
  const isOwner = list?.ownerId === currentUserId();
  const go = (path: string) => {
    closeSheet();
    navigate(path);
  };
  return (
    <Modal open={Boolean(listId)} onClose={closeSheet} title="List options" size="sm">
      {list ? (
        <div className="flex flex-col gap-1.5 pt-0.5">
          {isOwner ? <ActionRow icon="edit" label="Rename list" onClick={() => openSheet({ kind: 'renameList', listId: list.id })} /> : null}
          {isOwner ? <ActionRow icon="settings" label="Edit icon & description" onClick={() => openSheet({ kind: 'editList', listId: list.id })} /> : null}
          <ActionRow icon="share" label="Share list" onClick={() => openSheet({ kind: 'share', listId: list.id })} />
          <ActionRow icon="users" label="Members" onClick={() => go(`/lists/${list.id}/members`)} />
          <ActionRow icon="clock" label="Activity" onClick={() => go(`/lists/${list.id}/activity`)} />
          <ActionRow
            icon="refresh"
            label="Uncheck all items"
            onClick={() => {
              closeSheet();
              void uncheckAllWithUndo(list.id);
            }}
          />
          <ActionRow
            icon="check"
            label="Clear purchased items"
            onClick={() => {
              closeSheet();
              void clearPurchasedWithUndo(list.id);
            }}
          />
          <hr className="my-1 border-line" />
          {isOwner ? (
            <ActionRow icon="trash" tone="danger" label="Delete list" onClick={() => openSheet({ kind: 'deleteList', listId: list.id })} />
          ) : (
            <ActionRow icon="logout" tone="danger" label="Leave list" onClick={() => go(`/lists/${list.id}/members`)} />
          )}
        </div>
      ) : null}
    </Modal>
  );
}

// 14 / 15 Quick add --------------------------------------------------------------------

function QuickAddSheet({ open, listId, text }: { open: boolean; listId?: string; text?: string }) {
  const summaries = useListSummaries();
  const profile = useMyProfile();
  const recent = useRecentItems();
  const fallback = pickDefaultList(summaries, profile);
  const [target, setTarget] = useState<string | undefined>(listId);
  const [name, setName] = useState('');
  const [details, setDetails] = useState(false);
  const [qty, setQty] = useState<number | null>(null);
  const [unit, setUnit] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [unitOpen, setUnitOpen] = useState(false);
  const [pickList, setPickList] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setTarget(listId ?? fallback?.id);
    setName(text ?? '');
    setDetails(false);
    setQty(null);
    setUnit(null);
    setNote('');
    setPickList(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const targetList = summaries?.find((s) => s.list.id === (target ?? fallback?.id))?.list ?? fallback;
  const q = name.trim().toLowerCase();
  const matches = useMemo(() => (q ? (recent ?? []).filter((i) => i.name.toLowerCase().includes(q)).slice(0, 4) : []), [q, recent]);

  const add = async (input: { name: string; quantity?: number | null; unit?: string | null; note?: string }) => {
    if (!targetList || !input.name.trim()) return;
    await addItem({ listId: targetList.id, ...input });
    showToast({ icon: 'check', message: `${input.name.trim()} added to ${targetList.title}` });
    setName('');
    setQty(null);
    setUnit(null);
    setNote('');
    setDetails(false);
    inputRef.current?.focus();
  };

  if (!summaries) return null;

  return (
    <Modal open={open} onClose={closeSheet} title="Add item">
      {!targetList ? (
        <div className="flex flex-col gap-4 pt-2">
          <p className="type-body text-secondary">Create a list first, then add things to it.</p>
          <Button onClick={() => openSheet({ kind: 'createList' })}>Create a list</Button>
        </div>
      ) : details ? (
        <form
          className="flex flex-col gap-4 pt-1"
          onSubmit={(e) => {
            e.preventDefault();
            void add({ name, quantity: qty, unit, note });
          }}
        >
          <Input ref={inputRef} label="Item name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} autoFocus />
          <div className="flex items-center justify-between gap-3">
            <span className="type-label text-body">
              Quantity <span className="font-normal text-secondary">(optional)</span>
            </span>
            <Stepper label="Quantity" value={qty} onChange={setQty} step={stepFor(unit)} />
          </div>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 type-label text-body">Unit</legend>
            <div className="flex flex-wrap gap-2">
              {quickFor(profile?.unitPrefs).map((u) => (
                <Chip key={u} label={unitChipLabel(u)} state={unit === u ? 'active' : 'outline'} onClick={() => setUnit(unit === u ? null : u)} />
              ))}
              <Chip
                label={unit && !quickFor(profile?.unitPrefs).includes(unit) ? unitChipLabel(unit) : 'More'}
                state={unit && !quickFor(profile?.unitPrefs).includes(unit) ? 'active' : 'outline'}
                onClick={() => setUnitOpen(true)}
              />
            </div>
          </fieldset>
          <Input label="Note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Get ripe ones" maxLength={500} />
          <AddToSelector title={targetList.title} open={pickList} onToggle={() => setPickList((p) => !p)} />
          {pickList ? <ListPickerChips current={targetList.id} onPick={(id) => (setTarget(id), setPickList(false))} /> : null}
          <Button type="submit" disabled={!name.trim()}>
            Add item
          </Button>
          <UnitPicker open={unitOpen} value={unit} onClose={() => setUnitOpen(false)} onPick={setUnit} />
        </form>
      ) : (
        <div className="flex flex-col gap-3.5 pt-1">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void add({ name });
            }}
            className="flex h-14 items-center gap-2.5 rounded-full border-[1.5px] border-line-focus bg-surface pl-[18px] pr-1.5"
          >
            <label htmlFor="quick-add" className="sr-only">
              Item name
            </label>
            <input
              id="quick-add"
              ref={inputRef}
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="What do you need to buy?"
              maxLength={120}
              autoComplete="off"
              enterKeyHint="done"
              className="h-full min-w-0 flex-1 bg-transparent type-body-strong text-ink placeholder:font-normal placeholder:text-secondary focus:outline-none"
            />
            <button
              type="submit"
              disabled={!name.trim()}
              className="focus-ring inline-flex h-11 shrink-0 items-center rounded-full bg-brand-strong px-[18px] type-body-strong text-on-brand disabled:opacity-50"
            >
              Add
            </button>
          </form>
          {name.trim() ? (
            <button type="button" onClick={() => setDetails(true)} className="focus-ring self-start rounded-12 px-1 py-1 type-label text-link">
              Add quantity, unit or note
            </button>
          ) : null}

          {matches.length ? (
            <section aria-labelledby="matches-h" className="flex flex-col gap-2.5">
              <h3 id="matches-h" className="type-body-strong text-ink">
                Matches
              </h3>
              {matches.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => void add({ name: m.name, quantity: m.quantity, unit: m.unit })}
                  className="focus-ring flex items-center gap-3 rounded-16 border border-line bg-surface px-3.5 py-3 text-left hover:bg-muted"
                >
                  <span className="min-w-0 flex-1 truncate type-body-strong text-ink">
                    <Highlight text={m.name} q={q} />
                  </span>
                  {m.quantity != null || m.unit ? <span className="shrink-0 type-caption text-secondary">last: {formatQuantity(m.quantity, m.unit)}</span> : null}
                  <Icon name="plus" size={18} className="shrink-0 text-ink" />
                  <span className="sr-only">Add {m.name}</span>
                </button>
              ))}
            </section>
          ) : null}

          {recent && recent.length ? (
            <section aria-labelledby="recent-h" className="flex flex-col gap-2.5">
              <h3 id="recent-h" className="type-body-strong text-ink">
                Recently used
              </h3>
              <div className="flex flex-wrap gap-2">
                {recent.slice(0, 8).map((r) => (
                  <Chip key={r.id} label={r.name} state="outline" onClick={() => void add({ name: r.name, quantity: r.quantity, unit: r.unit })} />
                ))}
              </div>
            </section>
          ) : null}

          <p className="type-caption text-secondary">
            Tap a suggestion to add it to{' '}
            <button type="button" onClick={() => setPickList((p) => !p)} className="focus-ring rounded-[4px] font-semibold text-ink underline-offset-2 hover:underline">
              {targetList.title}
            </button>
            .
          </p>
          {pickList ? <ListPickerChips current={targetList.id} onPick={(id) => (setTarget(id), setPickList(false))} /> : null}
        </div>
      )}
    </Modal>
  );
}

function Highlight({ text, q }: { text: string; q: string }) {
  const i = text.toLowerCase().indexOf(q);
  if (i < 0 || !q) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <mark className="rounded-[4px] bg-match px-0.5 text-ink">{text.slice(i, i + q.length)}</mark>
      {text.slice(i + q.length)}
    </>
  );
}

function AddToSelector({ title, open, onToggle }: { title: string; open: boolean; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle} aria-expanded={open} className="focus-ring flex items-center gap-3 rounded-16 bg-muted px-3.5 py-3 text-left">
      <span className="inline-flex size-9 items-center justify-center rounded-full bg-surface text-ink">
        <Icon name="bag" size={18} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="type-small text-secondary">Add to</span>
        <span className="truncate type-body-strong text-ink">{title}</span>
      </span>
      <Icon name="chevron-down" size={18} className={cn('text-ink transition-transform', open && 'rotate-180')} />
    </button>
  );
}

function ListPickerChips({ current, onPick }: { current: string; onPick: (id: string) => void }) {
  const summaries = useListSummaries();
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Choose a list">
      {summaries?.map((s) => (
        <Chip key={s.list.id} label={s.list.title} role="radio" aria-checked={s.list.id === current} aria-pressed={undefined} state={s.list.id === current ? 'active' : 'outline'} onClick={() => onPick(s.list.id)} />
      ))}
    </div>
  );
}

// 29 Edit item (phone and tablet) ----------------------------------------------------------

function EditItemSheet({ itemId, focus }: { itemId?: string; focus?: 'note' }) {
  const item = useItem(itemId);
  return (
    <Modal open={Boolean(itemId)} onClose={closeSheet} title="Edit item">
      {item ? <ItemEditor key={item.id} mode="edit" item={item} focus={focus} onDone={closeSheet} /> : null}
    </Modal>
  );
}

// 26 Item actions --------------------------------------------------------------------------

function ItemActionsSheet({ itemId }: { itemId?: string }) {
  const item = useItem(itemId);
  const by = item?.createdBy === currentUserId() ? 'added by you' : 'added by a member';
  const subtitle = [item?.note, by].filter(Boolean).join(' · ');
  return (
    <Modal open={Boolean(itemId && item)} onClose={closeSheet} title={item?.name ?? 'Item'} size="sm">
      {item ? (
      <div className="flex flex-col gap-4">
        <p className="-mt-2 type-caption text-secondary">{subtitle}</p>
        <div className="flex items-center justify-between rounded-18 bg-muted px-3.5 py-3">
          <span className="type-label text-body">Quantity</span>
          <Stepper
            label="Quantity"
            value={item.quantity}
            step={stepFor(item.unit)}
            display={formatQuantity(item.quantity, item.unit) || '–'}
            onChange={(q) => void updateItem(item.id, { quantity: q })}
          />
        </div>
        <Button
          icon="check"
          onClick={() => {
            closeSheet();
            void togglePurchased(item, !item.purchasedAt);
          }}
        >
          {item.purchasedAt ? 'Mark as not purchased' : 'Mark as purchased'}
        </Button>
        <div className="flex flex-col gap-1">
          <ActionRow icon="edit" label="Edit item" onClick={() => openSheet({ kind: 'editItem', itemId: item.id })} />
          <ActionRow icon="comment" label={item.note ? 'Edit note' : 'Add a note'} onClick={() => openSheet({ kind: 'editItem', itemId: item.id, focus: 'note' })} />
          <ActionRow icon="arrow-right" label="Move to another list" onClick={() => openSheet({ kind: 'moveItem', itemId: item.id })} />
          <ActionRow
            icon="trash"
            tone="danger"
            label="Delete item"
            onClick={() => {
              closeSheet();
              void deleteWithUndo(item);
            }}
          />
        </div>
      </div>
      ) : null}
    </Modal>
  );
}

function MoveItemSheet({ itemId }: { itemId?: string }) {
  const item = useItem(itemId);
  const summaries = useListSummaries();
  const others = summaries?.filter((s) => s.list.id !== item?.listId) ?? [];
  return (
    <Modal open={Boolean(itemId)} onClose={closeSheet} title="Move to another list" size="sm">
      <div className="flex flex-col gap-1 pt-1">
        {others.length ? (
          others.map((s) => (
            <ActionRow
              key={s.list.id}
              icon="list"
              label={s.list.title}
              description={`${s.stats.total} items`}
              onClick={async () => {
                if (!item) return;
                await moveItem(item.id, s.list.id);
                closeSheet();
                showToast({ icon: 'arrow-right', message: `${item.name} moved to ${s.list.title}` });
              }}
            />
          ))
        ) : (
          <p className="type-body text-secondary">You have no other lists yet.</p>
        )}
      </div>
    </Modal>
  );
}
