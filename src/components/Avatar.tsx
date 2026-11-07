import { cn } from '@/lib/cn';

export type AvatarTone = 'ink' | 'blue' | 'peach' | 'lavender' | 'mint';
export type AvatarSize = 28 | 36 | 44 | 72;

const toneClass: Record<AvatarTone, string> = {
  ink: 'bg-brand-strong text-on-brand',
  blue: 'bg-avatar-blue text-avatar-blue-text',
  peach: 'bg-avatar-peach text-avatar-peach-text',
  lavender: 'bg-avatar-lavender text-avatar-lavender-text',
  mint: 'bg-avatar-mint text-avatar-mint-text',
};

const sizeClass: Record<AvatarSize, string> = {
  28: 'size-7 text-[11px]',
  36: 'size-9 text-[13px]',
  44: 'size-11 text-[15px]',
  72: 'size-[72px] text-[28px] font-semibold',
};

export const avatarTones: AvatarTone[] = ['ink', 'blue', 'peach', 'lavender', 'mint'];

type AvatarProps = {
  /** Display name; the initials are derived from it and it becomes the accessible label. */
  name: string;
  tone?: AvatarTone;
  size?: AvatarSize;
  className?: string;
};

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? '?';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return (first + last).toUpperCase();
}

/** Figma "Avatar" (111:73): member initial avatar with a 2px ring. */
export function Avatar({ name, tone = 'ink', size = 28, className }: AvatarProps) {
  const initials = size === 28 ? initialsOf(name).slice(0, 1) : initialsOf(name);
  return (
    <span
      role="img"
      aria-label={name}
      title={name}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full border-2 border-avatar-ring font-bold leading-[18px]',
        sizeClass[size],
        toneClass[tone],
        className,
      )}
    >
      <span aria-hidden>{initials}</span>
    </span>
  );
}

/** Stacked 28px avatars with -8px overlap, as on List Card. */
export function AvatarStack({
  people,
  max = 3,
  className,
}: {
  people: Array<{ name: string; tone: AvatarTone }>;
  max?: number;
  className?: string;
}) {
  const shown = people.slice(0, max);
  const extra = people.length - shown.length;
  return (
    <span className={cn('flex items-center', className)} aria-label={`${people.length} members`} role="group">
      {shown.map((p, i) => (
        <Avatar key={p.name + i} name={p.name} tone={p.tone} size={28} className={i > 0 ? '-ml-2' : undefined} />
      ))}
      {extra > 0 ? (
        <span className="-ml-2 inline-flex size-7 items-center justify-center rounded-full border-2 border-avatar-ring bg-muted text-[11px] font-bold text-body">
          +{extra}
        </span>
      ) : null}
    </span>
  );
}
