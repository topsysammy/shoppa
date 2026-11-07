import { cn } from '@/lib/cn';
import { Icon } from './icons/Icon';

type ShopItemProps = {
  name: string;
  /** e.g. "3 tuber · big ones" (hidden once ticked) */
  detail?: string;
  /** Ticked rows show one struck-through line, e.g. "Tomatoes · 1 kg" (screen 33). */
  checkedLabel?: string;
  checked: boolean;
  onToggle: (checked: boolean) => void;
  className?: string;
};

/**
 * Figma "Shop Item" (118:98), used in Shopping Mode.
 * PRD principle 2: rows are at least 80px tall with a 32px checkbox at every
 * width. The whole row is the tap target (role="checkbox"). Figma draws
 * checked rows at 56px; they are kept at 80px here so un-ticking stays easy.
 */
export function ShopItem({ name, detail, checkedLabel, checked, onToggle, className }: ShopItemProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={() => onToggle(!checked)}
      className={cn(
        'focus-ring flex min-h-20 w-full items-center gap-4 rounded-20 px-4 text-left transition-colors',
        checked ? 'bg-muted py-3' : 'border border-line bg-surface py-4 active:bg-muted',
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          'inline-flex size-8 shrink-0 items-center justify-center rounded-full',
          checked ? 'bg-shop-check text-shop-check-fg' : 'border-2 border-line-check',
        )}
      >
        {checked ? <Icon name="check" size={18} strokeWidth={2.6} /> : null}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className={cn('truncate', checked ? 'type-body-strong text-tertiary line-through' : 'type-shop text-ink')}>
          {checked ? (checkedLabel ?? name) : name}
        </span>
        {detail && !checked ? <span className="type-small text-secondary">{detail}</span> : null}
      </span>
    </button>
  );
}
