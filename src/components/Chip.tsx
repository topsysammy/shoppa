import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export type ChipState = 'default' | 'selected' | 'outline' | 'active';

type ChipProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  label: string;
  state?: ChipState;
};

const stateClass: Record<ChipState, string> = {
  default: 'bg-muted text-ink font-medium hover:bg-selected',
  selected: 'bg-selected text-ink font-semibold',
  outline: 'bg-surface text-ink font-medium border border-line-strong hover:bg-muted',
  active: 'bg-brand-strong text-on-brand font-semibold',
};

/**
 * Figma "Chip" (111:31). Default/Selected for filter rows, Outline for tag
 * groups, Active for a picked option in forms (e.g. unit picker).
 * Visual height is 36px; the ::before extends the tap target to 44px.
 */
export function Chip({ label, state = 'default', className, type = 'button', ...rest }: ChipProps) {
  const pressed = state === 'selected' || state === 'active';
  return (
    <button
      type={type}
      aria-pressed={rest['aria-pressed'] ?? pressed}
      className={cn(
        'focus-ring relative inline-flex h-9 shrink-0 items-center justify-center whitespace-nowrap rounded-full px-4 text-[14px] leading-[22px] transition-colors',
        "before:absolute before:inset-x-0 before:-inset-y-1 before:content-['']",
        stateClass[state],
        className,
      )}
      {...rest}
    >
      {label}
    </button>
  );
}
