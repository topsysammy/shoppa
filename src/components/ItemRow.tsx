import type { MouseEvent } from 'react';
import { cn } from '@/lib/cn';
import { Checkbox } from './Checkbox';
import { IconButton } from './IconButton';

export type ItemRowProps = {
  name: string;
  /** Pre-formatted quantity and unit, e.g. "2 paint". */
  quantity: string;
  note?: string;
  checked: boolean;
  onToggle?: (checked: boolean) => void;
  /** Opens item details (row tap on phone, side panel on desktop). */
  onOpen?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  /** Opens Item actions (more icon / right-click). */
  onMore?: (e: MouseEvent) => void;
  /** Screen 32: purchased rows show an inline Undo button. */
  onUndo?: () => void;
  /** Hide the divider on the last row (Figma note). */
  last?: boolean;
  className?: string;
};

/**
 * Figma "Item Row" (114:63).
 * I5: on desktop (1024px+) hover or keyboard focus reveals Edit and Delete;
 * the more icon and right-click open Item actions. Touch swipe gestures are
 * added in phase 3 on top of this row.
 */
export function ItemRow({
  name,
  quantity,
  note,
  checked,
  onToggle,
  onOpen,
  onEdit,
  onDelete,
  onMore,
  onUndo,
  last,
  className,
}: ItemRowProps) {
  const showUndo = checked && onUndo;
  return (
    <div
      className={cn(
        'group relative flex min-h-[68px] items-center gap-3.5 bg-surface px-4 py-[13px]',
        !last && 'border-b border-line',
        className,
      )}
      onContextMenu={
        onMore
          ? (e) => {
              e.preventDefault();
              onMore(e);
            }
          : undefined
      }
    >
      <Checkbox
        checked={checked}
        onChange={onToggle}
        label={checked ? `Mark ${name} as not purchased` : `Mark ${name} as purchased`}
      />
      <button
        type="button"
        onClick={onOpen}
        className="focus-ring flex min-h-11 min-w-0 flex-1 items-center gap-3.5 rounded-12 text-left"
      >
        <span className="flex min-w-0 flex-1 flex-col gap-px">
          <span
            className={cn(
              'truncate text-[16px] leading-[22px]',
              checked ? 'font-medium text-tertiary line-through' : 'font-semibold text-ink',
            )}
          >
            {name}
            {showUndo && quantity ? ` · ${quantity}` : null}
          </span>
          {note ? <span className="truncate type-caption text-secondary">{note}</span> : null}
        </span>
        {showUndo ? null : (
          <span
            className={cn(
              'shrink-0 whitespace-nowrap text-[14px] font-medium leading-[22px]',
              checked ? 'text-tertiary' : 'text-body',
            )}
          >
            {quantity}
          </span>
        )}
      </button>
      {showUndo ? (
        <button
          type="button"
          onClick={onUndo}
          aria-label={`Undo, mark ${name} as not purchased`}
          className="focus-ring relative inline-flex h-9 shrink-0 items-center rounded-full border border-line-strong bg-surface px-3.5 text-[14px] font-semibold text-ink hover:bg-muted before:absolute before:-inset-y-1 before:inset-x-0 before:content-['']"
        >
          Undo
        </button>
      ) : null}
      {onEdit || onDelete || onMore ? (
        <span
          className={cn(
            'hidden shrink-0 items-center desktop:flex',
            // Hover actions: hidden until hover or focus inside the row
            'desktop:w-0 desktop:overflow-hidden desktop:opacity-0 desktop:group-focus-within:w-auto desktop:group-focus-within:opacity-100 desktop:group-hover:w-auto desktop:group-hover:opacity-100',
          )}
        >
          {onEdit ? <IconButton variant="ghost" icon="edit" label={`Edit ${name}`} onClick={onEdit} /> : null}
          {onDelete ? <IconButton variant="ghost" icon="trash" label={`Delete ${name}`} onClick={onDelete} /> : null}
        </span>
      ) : null}
      {onMore ? (
        <span className="-mr-2 hidden desktop:flex">
          <IconButton variant="ghost" icon="more" label={`More actions for ${name}`} onClick={onMore} />
        </span>
      ) : null}
    </div>
  );
}
