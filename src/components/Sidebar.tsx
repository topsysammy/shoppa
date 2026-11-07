import { Link } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { Button } from './Button';
import { Icon } from './icons/Icon';
import { Kbd } from './Kbd';
import { Logo } from './Logo';
import { navTabs, type NavTab } from './NavBar';

type SidebarProps = {
  active: NavTab | 'notifications' | 'search' | null;
  onNewList: () => void;
  onSearch: () => void;
  unread?: number;
  inline?: boolean;
  className?: string;
};

/**
 * W6 Sidebar: desktop navigation (1024px+) replacing the Nav Bar.
 * Search sits at the top with the "/" shortcut (W7).
 */
export function Sidebar({ active, onNewList, onSearch, unread = 0, inline, className }: SidebarProps) {
  return (
    <nav
      aria-label="Main"
      className={cn(
        'flex w-[264px] shrink-0 flex-col gap-6 border-r border-line bg-surface px-4 py-6',
        inline ? 'h-[620px] rounded-20 border' : 'sticky top-0 h-dvh',
        className,
      )}
    >
      <Link to="/home" className="focus-ring flex items-center gap-2.5 self-start rounded-12 px-2 py-1">
        <Logo height={28} label="" />
        <span className="type-title text-ink">Shoppa</span>
      </Link>

      <button
        type="button"
        onClick={onSearch}
        aria-current={active === 'search' ? 'page' : undefined}
        className="focus-ring flex h-11 items-center gap-2.5 rounded-12 border border-line-strong bg-surface px-3 text-left text-secondary hover:bg-muted"
      >
        <Icon name="search" size={18} />
        <span className="flex-1 type-body">Search</span>
        <Kbd>/</Kbd>
      </button>

      <ul className="flex flex-col gap-1">
        {navTabs.map((t) => (
          <li key={t.id}>
            <SideLink to={t.to} icon={t.icon} label={t.label} active={active === t.id} />
          </li>
        ))}
        <li>
          <SideLink
            to="/notifications"
            icon="bell"
            label="Notifications"
            active={active === 'notifications'}
            badge={unread > 0 ? String(unread) : undefined}
          />
        </li>
      </ul>

      <div className="mt-auto">
        <Button icon="plus" onClick={onNewList} size="md">
          New list
        </Button>
      </div>
    </nav>
  );
}

function SideLink({
  to,
  icon,
  label,
  active,
  badge,
}: {
  to: string;
  icon: Parameters<typeof Icon>[0]['name'];
  label: string;
  active: boolean;
  badge?: string;
}) {
  return (
    <Link
      to={to}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'focus-ring flex h-11 items-center gap-3 rounded-12 px-3 type-body-medium transition-colors',
        active ? 'bg-muted font-semibold text-brand-text' : 'text-body hover:bg-muted hover:text-ink',
      )}
    >
      <Icon name={icon} size={22} />
      <span className="flex-1">{label}</span>
      {badge ? (
        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-alert px-1.5 type-small-strong text-white">
          {badge}
          <span className="sr-only"> unread</span>
        </span>
      ) : null}
    </Link>
  );
}
