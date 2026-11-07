import { cn } from '@/lib/cn';

type ProgressBarProps = {
  /** 0 to 1 */
  value: number;
  /** Accessible name, e.g. "Weekly Groceries progress". */
  label: string;
  /** "onBrand" is the white-on-green bar in the Shopping Mode header (screen 33). */
  tone?: 'default' | 'onBrand';
  className?: string;
};

/** Figma "Progress Bar" (111:85): 6px track, green fill. Lime marks progress (PRD principle 4). */
export function ProgressBar({ value, label, tone = 'default', className }: ProgressBarProps) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      className={cn('h-1.5 w-full overflow-hidden rounded-[3px]', tone === 'onBrand' ? 'bg-black/20' : 'bg-track', className)}
    >
      <div
        className={cn('h-full rounded-[3px] transition-[width] duration-300', tone === 'onBrand' ? 'bg-white' : 'bg-progress')}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
