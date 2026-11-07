import { useRef, useState, type PointerEvent, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Icon } from './icons/Icon';

type SwipeRowProps = {
  children: ReactNode;
  /** Swipe right: mark purchased (screen 27 "Complete"). */
  onComplete?: () => void;
  completeLabel?: string;
  onEdit?: () => void;
  onDelete?: () => void;
  className?: string;
};

const COMPLETE_W = 96;
const ACTIONS_W = 152;

/**
 * I5 on touch: swipe right marks purchased; swipe left reveals Edit and
 * Delete (Figma screen 27), and a long swipe left deletes straight away.
 * Mouse users get hover actions instead, so only touch and pen drag here.
 */
export function SwipeRow({ children, onComplete, completeLabel = 'Complete', onEdit, onDelete, className }: SwipeRowProps) {
  const [dx, setDx] = useState(0);
  const [open, setOpen] = useState(false);
  const start = useRef<{ x: number; y: number; base: number; locked: 'x' | 'y' | null; id: number } | null>(null);
  const width = useRef(360);

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse') return;
    width.current = e.currentTarget.offsetWidth;
    start.current = { x: e.clientX, y: e.clientY, base: open ? -ACTIONS_W : 0, locked: null, id: e.pointerId };
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const s = start.current;
    if (!s || s.id !== e.pointerId) return;
    const mx = e.clientX - s.x;
    const my = e.clientY - s.y;
    if (!s.locked) {
      if (Math.abs(mx) < 8 && Math.abs(my) < 8) return;
      s.locked = Math.abs(mx) > Math.abs(my) ? 'x' : 'y';
      if (s.locked === 'x') e.currentTarget.setPointerCapture(e.pointerId);
    }
    if (s.locked !== 'x') return;
    let next = s.base + mx;
    if (!onComplete) next = Math.min(0, next);
    if (!onEdit && !onDelete) next = Math.max(0, next);
    setDx(next);
  };
  const onPointerUp = () => {
    const s = start.current;
    start.current = null;
    if (!s || s.locked !== 'x') return;
    const w = width.current;
    if (dx > COMPLETE_W && onComplete) {
      onComplete();
      setDx(0);
      setOpen(false);
    } else if (dx < -w * 0.6 && onDelete) {
      onDelete();
      setDx(0);
      setOpen(false);
    } else if (dx < -ACTIONS_W / 2 && (onEdit || onDelete)) {
      setDx(-ACTIONS_W);
      setOpen(true);
    } else {
      setDx(0);
      setOpen(false);
    }
  };

  const close = () => {
    setDx(0);
    setOpen(false);
  };

  return (
    <div className={cn('relative overflow-hidden', className)}>
      {dx > 0 ? (
        <div className="absolute inset-0 flex items-center bg-brand-strong text-white" aria-hidden>
          <span className="flex w-24 flex-col items-center gap-[3px]">
            <Icon name="check" size={22} strokeWidth={2.4} />
            <span className="type-small-strong">{completeLabel}</span>
          </span>
        </div>
      ) : null}
      {dx < 0 || open ? (
        <div className="absolute inset-0 flex items-stretch justify-end bg-danger text-white">
          {onEdit ? (
            <button
              type="button"
              tabIndex={open ? 0 : -1}
              onClick={() => {
                close();
                onEdit();
              }}
              className="flex w-[76px] flex-col items-center justify-center gap-[3px] bg-secondary"
            >
              <Icon name="edit" size={20} />
              <span className="type-small-strong">Edit</span>
            </button>
          ) : null}
          {onDelete ? (
            <button
              type="button"
              tabIndex={open ? 0 : -1}
              onClick={() => {
                close();
                onDelete();
              }}
              className="flex w-[76px] flex-col items-center justify-center gap-[3px]"
            >
              <Icon name="trash" size={20} />
              <span className="type-small-strong">Delete</span>
            </button>
          ) : null}
        </div>
      ) : null}
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClickCapture={(e) => {
          if (open) {
            e.preventDefault();
            e.stopPropagation();
            close();
          }
        }}
        className={cn('relative touch-pan-y', start.current ? '' : 'transition-transform duration-200')}
        style={{ transform: `translateX(${dx}px)` }}
      >
        {children}
      </div>
    </div>
  );
}
