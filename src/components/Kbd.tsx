import { cn } from '@/lib/cn';

/** Keyboard shortcut hint (W7): a key cap used in tooltips, buttons and the shortcuts dialog. */
export function Kbd({ children, className }: { children: string; className?: string }) {
  return (
    <kbd
      className={cn(
        'inline-flex h-6 min-w-6 items-center justify-center rounded-[6px] border border-line-strong bg-muted px-1.5 font-sans text-[12px] font-semibold leading-4 text-body',
        className,
      )}
    >
      {children}
    </kbd>
  );
}

/** W7 shortcut map, shared by the shortcuts dialog and the keyboard handler (phase 3). */
export const shortcuts: Array<{ keys: string; action: string }> = [
  { keys: 'N', action: 'New item' },
  { keys: 'L', action: 'New list' },
  { keys: '/', action: 'Search' },
  { keys: 'S', action: 'Start Shopping Mode' },
  { keys: 'Esc', action: 'Close sheet, dialog or panel' },
  { keys: '?', action: 'Show keyboard shortcuts' },
];

/** Body of the W7 keyboard shortcuts dialog. */
export function ShortcutList() {
  return (
    <dl className="flex flex-col">
      {shortcuts.map((s, i) => (
        <div
          key={s.keys}
          className={cn('flex min-h-12 items-center justify-between gap-4', i < shortcuts.length - 1 && 'border-b border-line')}
        >
          <dt className="type-body text-ink">{s.action}</dt>
          <dd>
            <Kbd>{s.keys}</Kbd>
          </dd>
        </div>
      ))}
    </dl>
  );
}
