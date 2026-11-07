import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

type ToggleProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onChange' | 'children'> & {
  on: boolean;
  onChange?: (on: boolean) => void;
  /** Accessible name. Omit only when aria-labelledby points at a visible label. */
  label?: string;
};

/** Figma "Toggle" (111:84): 48x28 settings switch, role="switch". */
export function Toggle({ on, onChange, label, className, ...rest }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onChange?.(!on);
      }}
      className={cn(
        'focus-ring relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors',
        "before:absolute before:-inset-2 before:content-['']",
        on ? 'bg-brand' : 'bg-line-check',
        className,
      )}
      {...rest}
    >
      <span
        aria-hidden
        className={cn(
          'absolute top-[3px] size-[22px] rounded-full bg-white shadow-[0_1px_2px_rgb(0_0_0/0.2)] transition-[left] duration-150',
          on ? 'left-[23px]' : 'left-[3px]',
        )}
      />
    </button>
  );
}
