import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { Icon } from '@/components/icons/Icon';
import { Input } from '@/components/Input';
import { Toggle } from '@/components/Toggle';
import type { ItemRow } from '@/db/schema';
import { addItem, moveItem, updateItem } from '@/db/repo';
import { showToast } from '@/features/shell/toasts';
import { currentUserId } from '@/sync/currentUser';
import { deleteWithUndo } from './actions';
import { useListSummaries, useMyProfile } from './data';
import { UnitField, UnitPicker } from './UnitPicker';

type Props =
  | { mode: 'add'; listId: string; onDone: () => void; item?: undefined; focus?: undefined }
  | { mode: 'edit'; item: ItemRow; onDone: () => void; listId?: undefined; focus?: 'note' };

function timeAgo(iso: string): string {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  const d = Math.floor(s / 86400);
  return d === 1 ? 'yesterday' : `${d} days ago`;
}

/**
 * Screens 28 Add new item and 29 Edit item. Rendered in a bottom sheet on
 * phone, a dialog on tablet and the side panel on desktop (W6).
 */
export function ItemEditor(props: Props) {
  const editing = props.mode === 'edit' ? props.item : null;
  const summaries = useListSummaries();
  const profile = useMyProfile();
  const [name, setName] = useState(editing?.name ?? '');
  const [qty, setQty] = useState(editing?.quantity != null ? String(editing.quantity) : '');
  const [unit, setUnit] = useState<string | null>(editing?.unit ?? null);
  const [note, setNote] = useState(editing?.note ?? '');
  const [listId, setListId] = useState(editing?.listId ?? props.listId ?? '');
  const [purchased, setPurchased] = useState(Boolean(editing?.purchasedAt));
  const [unitOpen, setUnitOpen] = useState(false);
  const [error, setError] = useState('');
  const nameRef = useRef<HTMLInputElement>(null);
  const noteRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (props.focus === 'note' ? noteRef : nameRef).current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const parsedQty = (() => {
    const n = Number(qty.replace(',', '.'));
    return qty.trim() && Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null;
  })();

  const save = async (again: boolean) => {
    if (!name.trim()) {
      setError('Give the item a name.');
      nameRef.current?.focus();
      return;
    }
    if (qty.trim() && parsedQty == null) {
      setError('Quantity must be a number above 0.');
      return;
    }
    setError('');
    if (!editing) {
      await addItem({ listId, name, quantity: parsedQty, unit, note });
      if (again) {
        showToast({ icon: 'check', message: `${name.trim()} added` });
        setName('');
        setQty('');
        setUnit(null);
        setNote('');
        nameRef.current?.focus();
        return;
      }
    } else {
      await updateItem(editing.id, {
        name,
        quantity: parsedQty,
        unit,
        note,
        ...(purchased !== Boolean(editing.purchasedAt) ? { purchasedAt: purchased ? new Date().toISOString() : null } : {}),
      });
      if (listId !== editing.listId) await moveItem(editing.id, listId);
    }
    props.onDone();
  };

  const addedByMe = editing?.createdBy === currentUserId();
  const lists = summaries?.map((s) => s.list) ?? [];

  return (
    <form
      noValidate
      onSubmit={(e: FormEvent) => {
        e.preventDefault();
        void save(false);
      }}
      className="flex flex-col gap-[18px] pt-1"
    >
      {editing ? (
        <p className="flex items-center gap-2 type-caption text-secondary">
          <Avatar size={28} name={addedByMe ? (profile?.displayName ?? 'You') : 'Member'} tone={addedByMe ? (profile?.avatarTone ?? 'ink') : 'blue'} />
          <span>
            Added by <strong className="font-semibold text-ink">{addedByMe ? 'you' : 'a member'}</strong> · {timeAgo(editing.createdAt)}
          </span>
        </p>
      ) : null}
      <Input ref={nameRef} label="Item name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Rice" maxLength={120} enterKeyHint="next" />
      <div className="flex gap-3">
        <Input
          className="flex-1"
          label={editing ? 'Quantity' : 'Quantity (optional)'}
          inputMode="decimal"
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          placeholder="1"
        />
        <UnitField value={unit} quantity={parsedQty} onOpen={() => setUnitOpen(true)} />
      </div>
      <Input ref={noteRef} label={editing ? 'Note' : 'Note (optional)'} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Buy the long grain one" maxLength={500} />

      {editing ? (
        <label className="flex flex-col gap-2">
          <span className="type-label text-body">List</span>
          <span className="relative">
            <select
              value={listId}
              onChange={(e) => setListId(e.target.value)}
              className="focus-ring h-[52px] w-full appearance-none rounded-12 border border-line-strong bg-surface pl-4 pr-10 type-body text-ink"
            >
              {lists.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.title}
                </option>
              ))}
            </select>
            <Icon name="chevron-down" size={18} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-ink" />
          </span>
        </label>
      ) : (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 type-label text-body">Add to list</legend>
          <div className="flex flex-wrap gap-2">
            {lists.map((l) => (
              <Chip key={l.id} label={l.title} state={l.id === listId ? 'active' : 'outline'} onClick={() => setListId(l.id)} />
            ))}
          </div>
        </fieldset>
      )}

      {editing ? (
        <div className="flex items-center justify-between rounded-16 bg-muted px-4 py-3" onClick={() => setPurchased((p) => !p)}>
          <span id="purchased-label" className="type-body-strong text-ink">
            Purchased
          </span>
          <Toggle on={purchased} onChange={setPurchased} aria-labelledby="purchased-label" />
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="type-caption text-danger">
          {error}
        </p>
      ) : null}

      <div className="mt-2 flex flex-col gap-3">
        <Button type="submit">{editing ? 'Save changes' : 'Add item'}</Button>
        {editing ? (
          <button
            type="button"
            onClick={() => {
              void deleteWithUndo(editing);
              props.onDone();
            }}
            className="focus-ring mx-auto min-h-11 rounded-12 px-4 type-body-strong text-danger"
          >
            Delete item
          </button>
        ) : (
          <button type="button" onClick={() => void save(true)} className="focus-ring mx-auto min-h-11 rounded-12 px-4 type-body-strong text-ink">
            Save &amp; add another
          </button>
        )}
      </div>

      <UnitPicker open={unitOpen} value={unit} onClose={() => setUnitOpen(false)} onPick={setUnit} />
    </form>
  );
}
