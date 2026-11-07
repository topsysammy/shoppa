import { cn } from '@/lib/cn';
import { Icon } from './icons/Icon';

type StepperProps = {
  value: number | null;
  onChange: (v: number | null) => void;
  /** Text shown between the buttons, e.g. "2 kg". */
  display?: string;
  step?: number;
  label: string;
  className?: string;
};

/** Quantity stepper from screens 14 and 26: two 44px round buttons around the value. */
export function Stepper({ value, onChange, display, step = 1, label, className }: StepperProps) {
  const v = value ?? 0;
  const dec = () => {
    const next = Math.round((v - step) * 100) / 100;
    onChange(next <= 0 ? null : next);
  };
  const inc = () => onChange(Math.round((v + step) * 100) / 100);
  return (
    <div className={cn('flex items-center gap-2', className)} role="group" aria-label={label}>
      <button
        type="button"
        onClick={dec}
        disabled={v <= 0}
        aria-label={`Decrease ${label.toLowerCase()}`}
        className="focus-ring inline-flex size-11 items-center justify-center rounded-full border border-line-strong bg-surface text-ink hover:bg-muted disabled:opacity-40"
      >
        <Icon name="minus" size={16} />
      </button>
      <output aria-live="polite" className="min-w-12 text-center text-[16px] font-semibold leading-[22px] text-ink">
        {display ?? (value == null ? '–' : String(value))}
      </output>
      <button
        type="button"
        onClick={inc}
        aria-label={`Increase ${label.toLowerCase()}`}
        className="focus-ring inline-flex size-11 items-center justify-center rounded-full border border-line-strong bg-surface text-ink hover:bg-muted"
      >
        <Icon name="plus" size={16} />
      </button>
    </div>
  );
}
