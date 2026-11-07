import { useId } from 'react';
import { cn } from '@/lib/cn';
import { Icon, type IconName } from './icons/Icon';
import { Toggle } from './Toggle';

type Base = {
  label: string;
  description?: string;
  icon?: IconName;
  /** Red label and icon for Log out / Delete account. */
  tone?: 'default' | 'danger';
  last?: boolean;
  className?: string;
};

type LinkRow = Base & { type: 'link'; value?: string; onClick: () => void };
type SwitchRow = Base & { type: 'switch'; on: boolean; onChange: (on: boolean) => void };

/** Figma "Settings Row" (114:234). Link shows a value and chevron; Switch has a Toggle. */
export function SettingsRow(props: LinkRow | SwitchRow) {
  const { label, description, icon, tone = 'default', last, className } = props;
  const labelId = useId();
  const descId = useId();
  const content = (
    <>
      {icon ? <Icon name={icon} size={19} className={tone === 'danger' ? 'text-danger' : 'text-ink'} /> : null}
      <span className="flex min-w-0 flex-1 flex-col gap-0.5 text-left">
        <span id={labelId} className={cn('type-body-medium', tone === 'danger' ? 'text-danger' : 'text-ink')}>
          {label}
        </span>
        {description ? (
          <span id={descId} className="type-caption text-secondary">
            {description}
          </span>
        ) : null}
      </span>
    </>
  );
  const rowClass = cn(
    'flex min-h-[51px] w-full items-center gap-3 bg-surface px-4 py-3.5',
    !last && 'border-b border-line',
    className,
  );

  if (props.type === 'switch') {
    return (
      <div className={rowClass} onClick={() => props.onChange(!props.on)}>
        {content}
        <Toggle
          on={props.on}
          onChange={props.onChange}
          aria-labelledby={labelId}
          aria-describedby={description ? descId : undefined}
        />
      </div>
    );
  }
  return (
    <button type="button" onClick={props.onClick} className={cn(rowClass, 'focus-ring hover:bg-muted')}>
      {content}
      {props.value ? <span className="shrink-0 text-[14px] leading-[22px] text-secondary">{props.value}</span> : null}
      <Icon name="chevron-right" size={17} className="shrink-0 text-tertiary" />
    </button>
  );
}
