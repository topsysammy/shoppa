import type { IconName } from '@/components/icons/Icon';
import type { ListIcon, ListKind } from '@/db/schema';

/** Screen 20 "Type" chips. */
export const listKinds: Array<{ id: ListKind; label: string }> = [
  { id: 'groceries', label: 'Groceries' },
  { id: 'household', label: 'Household' },
  { id: 'party', label: 'Party' },
  { id: 'business', label: 'Business' },
];

/** Screen 20 "Icon" choices, mapped to the Figma icon set. */
export const listIcons: Array<{ id: ListIcon; icon: IconName; label: string }> = [
  { id: 'bag', icon: 'bag', label: 'Shopping bag' },
  { id: 'home', icon: 'home', label: 'House' },
  { id: 'gift', icon: 'gift', label: 'Gift' },
  { id: 'leaf', icon: 'leaf', label: 'Fresh food' },
  { id: 'broom', icon: 'broom', label: 'Cleaning' },
  { id: 'box', icon: 'box', label: 'Box' },
];

export const kindLabel = (k: ListKind) => listKinds.find((x) => x.id === k)?.label ?? 'Groceries';
export const iconFor = (i: ListIcon): IconName => listIcons.find((x) => x.id === i)?.icon ?? 'bag';
