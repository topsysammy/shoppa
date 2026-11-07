import { Link } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { Icon, type IconName } from './icons/Icon';
import { IconButton } from './IconButton';

export type NavTab = 'home' | 'lists' | 'shared' | 'profile';

export const navTabs: Array<{ id: NavTab; label: string; icon: IconName; to: string }> = [
  { id: 'home', label: 'Home', icon: 'home', to: '/home' },
  { id: 'lists', label: 'Lists', icon: 'list', to: '/lists' },
  { id: 'shared', label: 'Shared', icon: 'users', to: '/shared' },
  { id: 'profile', label: 'Profile', icon: 'user', to: '/profile' },
];

type NavBarProps = {
  active: NavTab;
  onAdd: () => void;
  /** In the gallery the bar is shown inline instead of pinned to the viewport. */
  inline?: boolean;
  className?: string;
};

/**
 * Figma "Nav Bar" (114:176): bottom tabs with the raised + button.
 * Used below 1024px (phone and tablet); desktop uses Sidebar (W6).
 */
export function NavBar({ active, onAdd, inline, className }: NavBarProps) {
  return (
    <nav
      aria-label="Main"
      className={cn(
        'z-30 border-t border-line bg-surface px-1.5 pt-2 safe-bottom',
        inline ? 'relative' : 'fixed inset-x-0 bottom-0',
        className,
      )}
    >
      <ul className="mx-auto flex h-[78px] max-w-[640px] items-start">
        {navTabs.slice(0, 2).map((t) => (
          <Tab key={t.id} tab={t} active={active} />
        ))}
        <li className="flex flex-1 justify-center">
          <IconButton variant="fab" icon="plus" label="Add item or list" onClick={onAdd} />
        </li>
        {navTabs.slice(2).map((t) => (
          <Tab key={t.id} tab={t} active={active} />
        ))}
      </ul>
    </nav>
  );
}

function Tab({ tab, active }: { tab: (typeof navTabs)[number]; active: NavTab }) {
  const isActive = tab.id === active;
  return (
    <li className="flex flex-1 justify-center">
      <Link
        to={tab.to}
        aria-current={isActive ? 'page' : undefined}
        className={cn(
          'focus-ring flex min-h-11 min-w-14 flex-col items-center gap-1 rounded-12 px-2 pb-1',
          isActive ? 'font-semibold text-brand-text' : 'font-medium text-tertiary hover:text-body',
        )}
      >
        <Icon name={tab.icon} size={24} />
        <span className="text-[12px] leading-4">{tab.label}</span>
      </Link>
    </li>
  );
}
