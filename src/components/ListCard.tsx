import { cn } from '@/lib/cn';
import { AvatarStack, type AvatarTone } from './Avatar';
import { Badge, type BadgeTone } from './Badge';
import { Icon } from './icons/Icon';
import { ProgressBar } from './ProgressBar';

export type ListCardProps = {
  title: string;
  status: { label: string; tone: BadgeTone };
  members?: Array<{ name: string; tone: AvatarTone }>;
  itemCount: number;
  noteCount?: number;
  /** 0 to 1 */
  progress: number;
  /** Selected state for the desktop two-pane layout (W6). */
  selected?: boolean;
  onOpen?: () => void;
  className?: string;
};

/** Figma "List Card" (114:22): title, status badge, members, item/note counts, progress. */
export function ListCard({
  title,
  status,
  members = [],
  itemCount,
  noteCount = 0,
  progress,
  selected,
  onOpen,
  className,
}: ListCardProps) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-current={selected ? 'true' : undefined}
      className={cn(
        'focus-ring flex w-full flex-col gap-3 rounded-20 border bg-surface p-4 text-left shadow-card transition-colors hover:border-line-strong',
        selected ? 'border-line-focus' : 'border-line',
        className,
      )}
    >
      <span className="flex w-full items-start gap-3">
        <span className="min-w-0 flex-1 type-body-strong text-ink">{title}</span>
        <Badge label={status.label} tone={status.tone} />
      </span>
      <span className="flex w-full items-center justify-between">
        {members.length ? <AvatarStack people={members} /> : <span />}
        <span className="flex items-center gap-3.5 text-body">
          <span className="flex items-center gap-1">
            <Icon name="bag" size={15} />
            <span className="text-[13px] font-medium leading-[18px]">
              {itemCount}
              <span className="sr-only"> items</span>
            </span>
          </span>
          {noteCount > 0 ? (
            <span className="flex items-center gap-1">
              <Icon name="comment" size={15} />
              <span className="text-[13px] font-medium leading-[18px]">
                {noteCount}
                <span className="sr-only"> notes</span>
              </span>
            </span>
          ) : null}
        </span>
      </span>
      <ProgressBar value={progress} label={`${title} progress`} />
    </button>
  );
}
