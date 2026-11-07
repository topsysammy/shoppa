import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';
import { Icon } from './icons/Icon';

type CheckboxProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onChange' | 'children'> & {
  checked: boolean;
  onChange?: (checked: boolean) => void;
  /** Accessible name, e.g. "Mark Rice as purchased". */
  label: string;
  /** 26px in lists, 32px in Shopping Mode (PRD principle 2). */
  size?: 26 | 32;
};

/**
 * Figma "Checkbox" (111:79): round item checkbox. Renders as role="checkbox";
 * the ::before pads the tap target to at least 44px.
 */
export function Checkbox({ checked, onChange, label, size = 26, className, ...rest }: CheckboxProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onChange?.(!checked);
      }}
      className={cn(
        'focus-ring relative inline-flex shrink-0 items-center justify-center rounded-full transition-colors',
        "before:absolute before:-inset-2.5 before:content-['']",
        size === 26 ? 'size-[26px]' : 'size-8',
        checked ? 'bg-brand text-white' : 'border-[1.5px] border-line-check bg-surface',
        className,
      )}
      {...rest}
    >
      {checked ? <Icon name="check" size={size === 26 ? 14 : 18} strokeWidth={3.2} /> : null}
    </button>
  );
}
