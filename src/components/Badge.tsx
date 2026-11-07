import { cn } from '@/lib/cn';

export type BadgeTone = 'info' | 'alert' | 'done' | 'dark' | 'neutral';

const toneClass: Record<BadgeTone, string> = {
  info: 'bg-info text-white',
  alert: 'bg-alert text-white',
  done: 'bg-done text-white',
  dark: 'bg-brand-strong text-on-brand',
  neutral: 'bg-muted text-body',
};

/** Figma "Badge" (111:42): Info = items left, Alert = not started / not synced, Done = complete. */
export function Badge({ label, tone = 'info', className }: { label: string; tone?: BadgeTone; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-[11px] py-[5px] type-small-strong',
        toneClass[tone],
        className,
      )}
    >
      {label}
    </span>
  );
}
