import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Avatar, AvatarStack, avatarTones, type AvatarSize } from '@/components/Avatar';
import { Badge, type BadgeTone } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Checkbox } from '@/components/Checkbox';
import { Chip, type ChipState } from '@/components/Chip';
import { Icon, iconNames } from '@/components/icons/Icon';
import { IconButton } from '@/components/IconButton';
import { Input } from '@/components/Input';
import { InstallBanner } from '@/components/InstallBanner';
import { ItemRow } from '@/components/ItemRow';
import { Kbd, ShortcutList } from '@/components/Kbd';
import { ListCard } from '@/components/ListCard';
import { Logo } from '@/components/Logo';
import { MessageCard } from '@/components/MessageCard';
import { Modal } from '@/components/Modal';
import { NavBar, type NavTab } from '@/components/NavBar';
import { ProgressBar } from '@/components/ProgressBar';
import { SettingsRow } from '@/components/SettingsRow';
import { SheetHeader } from '@/components/SheetHeader';
import { ShopItem } from '@/components/ShopItem';
import { Sidebar } from '@/components/Sidebar';
import { ActionRow } from '@/components/ActionRow';
import { Stepper } from '@/components/Stepper';
import { SwipeRow } from '@/components/SwipeRow';
import { SidePanel } from '@/components/SidePanel';
import { Toast } from '@/components/Toast';
import { Toggle } from '@/components/Toggle';
import { TopBar } from '@/components/TopBar';
import { useTheme, type ThemePref } from '@/lib/theme';

/**
 * /dev/components: every PRD section 4 component in all its Figma variants,
 * rendered side by side in light and dark. Each panel sets data-theme, so the
 * tokens re-resolve inside it regardless of the page theme.
 */
export default function ComponentGallery() {
  const [theme, setTheme] = useTheme();
  return (
    <div className="min-h-dvh bg-ground">
      <header className="sticky top-0 z-20 border-b border-line bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-3 px-4 py-3 tablet:px-6">
          <Logo height={28} label="" />
          <div className="min-w-0 flex-1">
            <h1 className="type-title text-ink">Shoppa components</h1>
            <p className="hidden type-small text-secondary tablet:block">Figma page “Foundations &amp; Components”, light and dark</p>
          </div>
          <div role="radiogroup" aria-label="Page theme" className="order-last flex basis-full gap-1 tablet:order-none tablet:basis-auto">
            {(['light', 'dark', 'system'] as ThemePref[]).map((t) => (
              <Chip key={t} label={t[0]!.toUpperCase() + t.slice(1)} state={theme === t ? 'selected' : 'default'} role="radio" aria-checked={theme === t} aria-pressed={undefined} onClick={() => setTheme(t)} />
            ))}
          </div>
          <Link to="/home" className="focus-ring rounded-12 px-2 py-2 type-label text-link">
            Open app
          </Link>
        </div>
        <nav aria-label="Sections" className="mx-auto max-w-[1280px] overflow-x-auto px-4 pb-3 tablet:px-6">
          <ul className="flex gap-2">
            {sections.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="focus-ring inline-flex h-9 items-center whitespace-nowrap rounded-full bg-muted px-3 type-small text-body hover:bg-selected">
                  {s.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <main className="mx-auto flex max-w-[1280px] flex-col gap-10 px-4 py-8 tablet:px-6">
        {sections.map((s) => (
          <section key={s.id} id={s.id} aria-labelledby={`${s.id}-h`} className="scroll-mt-36">
            <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h2 id={`${s.id}-h`} className="type-heading text-ink">
                {s.title}
              </h2>
              <span className="type-small text-tertiary">{s.source}</span>
            </div>
            {s.note ? <p className="mb-4 max-w-[720px] type-caption text-secondary">{s.note}</p> : null}
            <div className="grid gap-4 desktop:grid-cols-2">
              <ThemePanel theme="light">{s.render()}</ThemePanel>
              <ThemePanel theme="dark">{s.render()}</ThemePanel>
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}

function ThemePanel({ theme, children }: { theme: 'light' | 'dark'; children: ReactNode }) {
  return (
    <div data-theme={theme} className="min-w-0 overflow-hidden rounded-20 border border-line bg-ground text-ink">
      <div className="border-b border-line px-4 py-2 type-small-strong text-secondary">{theme === 'light' ? 'Light' : 'Dark'}</div>
      <div className="overflow-x-auto p-4 tablet:p-5">{children}</div>
    </div>
  );
}

function Row({ children, label }: { children: ReactNode; label?: string }) {
  return (
    <div className="flex flex-col gap-2">
      {label ? <span className="type-small text-tertiary">{label}</span> : null}
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </div>
  );
}

function Stack({ children }: { children: ReactNode }) {
  return <div className="flex max-w-[390px] flex-col gap-4">{children}</div>;
}

/* ---------- demos (each panel keeps its own state) ---------- */

function CheckboxDemo() {
  const [a, setA] = useState(false);
  const [b, setB] = useState(true);
  const [c, setC] = useState(false);
  const [d, setD] = useState(true);
  return (
    <div className="flex flex-col gap-4">
      <Row label="26px (lists)">
        <Checkbox checked={a} onChange={setA} label="Mark rice as purchased" />
        <Checkbox checked={b} onChange={setB} label="Mark tomatoes as purchased" />
      </Row>
      <Row label="32px (Shopping Mode)">
        <Checkbox size={32} checked={c} onChange={setC} label="Mark yam as purchased" />
        <Checkbox size={32} checked={d} onChange={setD} label="Mark Peak milk as purchased" />
      </Row>
    </div>
  );
}

function ToggleDemo() {
  const [a, setA] = useState(false);
  const [b, setB] = useState(true);
  return (
    <Row>
      <Toggle on={a} onChange={setA} label="Example toggle, off" />
      <Toggle on={b} onChange={setB} label="Example toggle, on" />
    </Row>
  );
}

const demoItems = [
  { id: 'rice', name: 'Rice', quantity: '1 bag', note: 'Mama Gold, the long grain one' },
  { id: 'tomatoes', name: 'Tomatoes', quantity: '2 paint', note: 'Firm ones for stew' },
  { id: 'yam', name: 'Yam', quantity: '3 tuber' },
  { id: 'milk', name: 'Peak milk', quantity: '1 tin', note: 'Big tin' },
];

function ItemRowDemo() {
  const [done, setDone] = useState<Record<string, boolean>>({ tomatoes: true });
  return (
    <div className="max-w-[390px] overflow-hidden rounded-20 border border-line">
      {demoItems.map((it, i) => (
        <ItemRow
          key={it.id}
          name={it.name}
          quantity={it.quantity}
          note={it.note}
          checked={!!done[it.id]}
          onToggle={(v) => setDone((d) => ({ ...d, [it.id]: v }))}
          onEdit={() => undefined}
          onDelete={() => undefined}
          onMore={() => undefined}
          last={i === demoItems.length - 1}
        />
      ))}
    </div>
  );
}

const shopDemo = [
  { id: 'garri', name: 'Garri', detail: '1 congo · white' },
  { id: 'plantain', name: 'Plantain', detail: '1 bunch · ripe' },
  { id: 'yam', name: 'Yam', detail: '3 tuber · big ones' },
  { id: 'tomatoes', name: 'Tomatoes', detail: '2 paint' },
];

function ShopItemDemo() {
  const [done, setDone] = useState<Record<string, boolean>>({ tomatoes: true });
  return (
    <Stack>
      {shopDemo.map((it) => (
        <ShopItem
          key={it.id}
          name={it.name}
          detail={it.detail}
          checked={!!done[it.id]}
          onToggle={(v) => setDone((d) => ({ ...d, [it.id]: v }))}
        />
      ))}
    </Stack>
  );
}

function NavBarDemo() {
  const [active, setActive] = useState<NavTab>('home');
  return (
    <div className="flex max-w-[390px] flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {(['home', 'lists', 'shared', 'profile'] as NavTab[]).map((t) => (
          <Chip key={t} label={`Active=${t}`} state={active === t ? 'selected' : 'outline'} onClick={() => setActive(t)} />
        ))}
      </div>
      <div className="overflow-hidden rounded-20 border border-line" onClickCapture={(e) => e.preventDefault()}>
        <NavBar inline active={active} onAdd={() => undefined} />
      </div>
    </div>
  );
}

function ChipDemo() {
  const [unit, setUnit] = useState('paint');
  const units = ['bag', 'paint', 'tuber', 'congo', 'tin', 'bunch', 'basket'];
  return (
    <div className="flex flex-col gap-4">
      <Row label="States">
        {(['default', 'selected', 'outline', 'active'] as ChipState[]).map((s) => (
          <Chip key={s} label="Groceries" state={s} />
        ))}
      </Row>
      <Row label="Active for a picked option (unit picker)">
        {units.map((u) => (
          <Chip key={u} label={u} state={unit === u ? 'active' : 'outline'} onClick={() => setUnit(u)} />
        ))}
      </Row>
    </div>
  );
}

function SettingsDemo() {
  const [push, setPush] = useState(true);
  const [trip, setTrip] = useState(false);
  return (
    <div className="max-w-[390px] overflow-hidden rounded-20 border border-line">
      <SettingsRow type="link" icon="moon" label="Appearance" value="System" onClick={() => undefined} />
      <SettingsRow type="link" icon="ruler" label="Units" value="Local" onClick={() => undefined} />
      <SettingsRow type="switch" icon="bell" label="Notifications" description="Allow Shoppa to send notifications" on={push} onChange={setPush} />
      <SettingsRow type="switch" icon="bag-check" label="Trip finished" on={trip} onChange={setTrip} />
      <SettingsRow type="link" icon="logout" label="Log out" tone="danger" onClick={() => undefined} last />
    </div>
  );
}

function InputDemo() {
  const [email, setEmail] = useState('tope@email.com');
  return (
    <Stack>
      <Input label="Email address" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <Input label="Password" type="password" placeholder="Enter a password" helper="At least 8 characters, with a number." trailing={<IconButton variant="ghost" icon="eye" label="Show password" />} />
      <Input label="List name" defaultValue="" placeholder="Weekly Groceries" error="Give your list a name." />
    </Stack>
  );
}

function ModalDemo() {
  const [sheet, setSheet] = useState(false);
  const [dialog, setDialog] = useState(false);
  const [keys, setKeys] = useState(false);
  return (
    <div className="flex flex-col gap-4">
      <p className="type-caption text-secondary">
        Sheet is a bottom sheet under 640px and a centred dialog above it. Dialog is centred at every width. Both trap focus and
        close with Esc or a tap outside.
      </p>
      <Row>
        <Button fullWidth={false} size="md" onClick={() => setSheet(true)}>
          Open sheet
        </Button>
        <Button fullWidth={false} size="md" variant="secondary" onClick={() => setDialog(true)}>
          Open confirm dialog
        </Button>
        <Button fullWidth={false} size="md" variant="secondary" onClick={() => setKeys(true)}>
          Shortcuts (W7)
        </Button>
      </Row>
      <Modal
        open={sheet}
        onClose={() => setSheet(false)}
        title="Add new item"
        footer={<Button onClick={() => setSheet(false)}>Add to list</Button>}
      >
        <div className="flex flex-col gap-4 pt-2">
          <Input label="Item" defaultValue="Tomatoes" />
          <div className="flex flex-wrap gap-2">
            {['paint', 'basket', 'kg', 'bag'].map((u, i) => (
              <Chip key={u} label={u} state={i === 0 ? 'active' : 'outline'} />
            ))}
          </div>
        </div>
      </Modal>
      <Modal
        open={dialog}
        onClose={() => setDialog(false)}
        variant="dialog"
        size="sm"
        title="Delete item?"
        footer={
          <>
            <Button variant="danger" onClick={() => setDialog(false)}>
              Delete
            </Button>
            <Button variant="secondary" onClick={() => setDialog(false)}>
              Cancel
            </Button>
          </>
        }
      >
        <p className="type-body text-body">Yam (3 tuber) will be removed from Weekly Groceries. You can undo for a few seconds.</p>
      </Modal>
      <Modal open={keys} onClose={() => setKeys(false)} variant="dialog" title="Keyboard shortcuts">
        <ShortcutList />
      </Modal>
    </div>
  );
}

function StepperDemo() {
  const [q, setQ] = useState<number | null>(2);
  return <Stepper label="Quantity" value={q} onChange={setQ} display={q == null ? '–' : `${q} kg`} step={0.5} />;
}

function SwipeDemo() {
  const [done, setDone] = useState(false);
  return (
    <div className="max-w-[390px] overflow-hidden rounded-20 border border-line">
      <SwipeRow onComplete={() => setDone(true)} onEdit={() => undefined} onDelete={() => undefined}>
        <ItemRow name="Tomatoes" quantity="2 paint" checked={done} onToggle={setDone} onUndo={() => setDone(false)} last />
      </SwipeRow>
    </div>
  );
}

function SidePanelDemo() {
  const [open, setOpen] = useState(true);
  return (
    <div className="flex flex-col gap-3">
      {!open ? (
        <Button fullWidth={false} size="md" variant="secondary" onClick={() => setOpen(true)}>
          Show panel
        </Button>
      ) : null}
      <SidePanel
        inline
        open={open}
        onClose={() => setOpen(false)}
        title="Edit item"
        footer={
          <>
            <Button>Save changes</Button>
            <Button variant="secondary" icon="trash">
              Delete item
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Input label="Item" defaultValue="Yam" />
          <Input label="Quantity" defaultValue="3" inputMode="decimal" />
          <div className="flex flex-col gap-2">
            <span className="type-label text-body">Unit</span>
            <div className="flex flex-wrap gap-2">
              {['tuber', 'kg', 'bag'].map((u, i) => (
                <Chip key={u} label={u} state={i === 0 ? 'active' : 'outline'} />
              ))}
            </div>
          </div>
          <Input label="Note" defaultValue="Big ones, not too soft" />
        </div>
      </SidePanel>
    </div>
  );
}

const lists = [
  {
    title: 'Weekly Groceries',
    status: { label: '5 left', tone: 'info' as BadgeTone },
    members: [{ name: 'Tope Samuel', tone: 'ink' as const }],
    itemCount: 8,
    noteCount: 2,
    progress: 0.4,
  },
  {
    title: 'Shop restock',
    status: { label: 'Not started', tone: 'alert' as BadgeTone },
    members: [
      { name: 'Tope Samuel', tone: 'ink' as const },
      { name: 'Mum', tone: 'blue' as const },
      { name: 'Kemi Adeyemi', tone: 'lavender' as const },
      { name: 'Chidi Okafor', tone: 'peach' as const },
    ],
    itemCount: 14,
    progress: 0,
  },
  {
    title: 'House Supplies',
    status: { label: 'Almost done', tone: 'done' as BadgeTone },
    members: [
      { name: 'Tope Samuel', tone: 'ink' as const },
      { name: 'Mum', tone: 'blue' as const },
      { name: 'Kemi Adeyemi', tone: 'lavender' as const },
    ],
    itemCount: 5,
    noteCount: 1,
    progress: 0.8,
  },
];

function ListCardDemo() {
  const [sel, setSel] = useState(0);
  return (
    <Stack>
      {lists.map((l, i) => (
        <ListCard key={l.title} {...l} selected={sel === i} onOpen={() => setSel(i)} />
      ))}
    </Stack>
  );
}

type Section = { id: string; title: string; source: string; note?: string; render: () => ReactNode };

const sections: Section[] = [
  {
    id: 'colour',
    title: 'Colour tokens',
    source: 'Figma variables ml/*',
    note: 'Green surfaces that carry text use brand-strong (#158544) so white text passes 4.5:1. Figma #1FA855 stays for icon-only fills such as the + button and checked boxes.',
    render: () => (
      <div className="grid grid-cols-2 gap-3 tablet:grid-cols-4">
        {[
          ['brand', 'bg-brand'],
          ['brand-strong', 'bg-brand-strong'],
          ['progress', 'bg-progress'],
          ['yellow', 'bg-yellow'],
          ['info', 'bg-info'],
          ['alert', 'bg-alert'],
          ['done', 'bg-done'],
          ['danger', 'bg-danger'],
          ['link', 'bg-link'],
          ['ink (text)', 'bg-ink'],
          ['surface', 'bg-surface'],
          ['muted', 'bg-muted'],
          ['selected', 'bg-selected'],
          ['track', 'bg-track'],
          ['ground', 'bg-ground'],
          ['canvas', 'canvas-gradient'],
        ].map(([name, cls]) => (
          <div key={name} className="flex flex-col gap-1.5">
            <span className={`h-12 rounded-12 border border-line ${cls}`} />
            <span className="type-small text-secondary">{name}</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    id: 'type',
    title: 'Type',
    source: 'Figtree 400–700, self-hosted',
    render: () => (
      <div className="flex flex-col gap-2">
        <p className="type-display">Display · Hello, Tope</p>
        <p className="type-title">Title · Weekly Groceries</p>
        <p className="type-heading">Heading · Active lists</p>
        <p className="type-shop">Shop · Plantain</p>
        <p className="type-body-strong">Body Strong · Rice</p>
        <p className="type-body-medium">Body Medium · Tomatoes marked as purchased</p>
        <p className="type-body">Body · What do you need to buy?</p>
        <p className="type-label">Label · Email address</p>
        <p className="type-caption text-secondary">Caption · Buy the long grain one</p>
        <p className="type-small-strong">Small Strong · 5 left</p>
        <p className="type-small text-secondary">Small · 3 tuber · big ones</p>
      </div>
    ),
  },
  {
    id: 'icons',
    title: 'Icons',
    source: '110:2 · 44 icons, inline SVG',
    render: () => (
      <ul className="grid grid-cols-4 gap-2 tablet:grid-cols-6">
        {iconNames.map((n) => (
          <li key={n} className="flex flex-col items-center gap-1 rounded-12 bg-surface py-3 text-ink">
            <Icon name={n} />
            <span className="type-small text-tertiary">{n}</span>
          </li>
        ))}
      </ul>
    ),
  },
  {
    id: 'logo',
    title: 'Logo',
    source: '149:91 · app icon tile from screen 69',
    render: () => (
      <Row>
        <Logo height={40} />
        <Logo height={72} tile />
        <Logo height={48} tile />
        <Logo height={29} tile />
        <Logo height={17} tile />
      </Row>
    ),
  },
  {
    id: 'button',
    title: 'Button',
    source: '111:18',
    render: () => (
      <Stack>
        <Button>Start shopping</Button>
        <Button icon="plus">Add item</Button>
        <Button variant="secondary">End trip early</Button>
        <Button variant="secondary" icon="whatsapp">
          Share on WhatsApp
        </Button>
        <Button variant="danger" icon="trash">
          Delete list
        </Button>
        <Button loading>Saving</Button>
        <Button disabled>Add to list</Button>
        <Row label="Compact (44px), desktop headers">
          <Button size="md" fullWidth={false} icon="plus">
            New item
          </Button>
          <Button size="md" fullWidth={false} variant="secondary" icon="bag-check">
            Start Shopping Mode
          </Button>
        </Row>
      </Stack>
    ),
  },
  {
    id: 'icon-button',
    title: 'Icon Button',
    source: '111:19',
    render: () => (
      <div className="flex flex-col gap-4">
        <Row label="Outline">
          <IconButton icon="back" label="Back" />
          <IconButton icon="search" label="Search" />
          <IconButton icon="bell" label="Notifications, 2 unread" dot />
          <IconButton icon="more" label="List options" />
          <IconButton icon="share" label="Share list" />
        </Row>
        <Row label="Close · Ghost (hover actions) · FAB">
          <IconButton variant="close" icon="close" label="Close" />
          <IconButton variant="ghost" icon="edit" label="Edit item" />
          <IconButton variant="ghost" icon="trash" label="Delete item" />
          <IconButton variant="fab" icon="plus" label="Add item" />
        </Row>
      </div>
    ),
  },
  { id: 'chip', title: 'Chip', source: '111:31', render: () => <ChipDemo /> },
  {
    id: 'badge',
    title: 'Badge',
    source: '111:42',
    render: () => (
      <Row>
        <Badge label="5 left" tone="info" />
        <Badge label="Not synced" tone="alert" />
        <Badge label="Done" tone="done" />
        <Badge label="Shared" tone="dark" />
        <Badge label="Archived" tone="neutral" />
      </Row>
    ),
  },
  {
    id: 'avatar',
    title: 'Avatar',
    source: '111:73',
    render: () => (
      <div className="flex flex-col gap-4">
        {([28, 36, 44] as AvatarSize[]).map((s) => (
          <Row key={s} label={`${s}px`}>
            {avatarTones.map((t, i) => (
              <Avatar key={t} size={s} tone={t} name={['Tope Samuel', 'Mum', 'Chidi Okafor', 'Kemi Adeyemi', 'Aisha Bello'][i]!} />
            ))}
          </Row>
        ))}
        <Row label="Stack (-8px), with overflow">
          <AvatarStack
            people={[
              { name: 'Tope Samuel', tone: 'ink' },
              { name: 'Mum', tone: 'blue' },
              { name: 'Kemi Adeyemi', tone: 'lavender' },
              { name: 'Chidi Okafor', tone: 'peach' },
              { name: 'Aisha Bello', tone: 'mint' },
            ]}
          />
        </Row>
      </div>
    ),
  },
  { id: 'checkbox', title: 'Checkbox', source: '111:79', render: () => <CheckboxDemo /> },
  { id: 'toggle', title: 'Toggle', source: '111:84', render: () => <ToggleDemo /> },
  {
    id: 'progress',
    title: 'Progress Bar',
    source: '111:85',
    render: () => (
      <Stack>
        <ProgressBar value={0} label="Not started" />
        <ProgressBar value={0.4} label="Weekly Groceries progress" />
        <ProgressBar value={1} label="Complete" />
        <div className="rounded-20 bg-brand-strong p-4">
          <ProgressBar tone="onBrand" value={0.5} label="Shopping Mode progress" />
        </div>
      </Stack>
    ),
  },
  { id: 'input', title: 'Input', source: '114:21', render: () => <InputDemo /> },
  { id: 'list-card', title: 'List Card', source: '114:22', render: () => <ListCardDemo /> },
  {
    id: 'item-row',
    title: 'Item Row',
    source: '114:63 · I5',
    note: 'At 1024px and up, hover or keyboard focus shows Edit and Delete; right-click or the more icon opens Item actions. Swipe on touch arrives in phase 3.',
    render: () => <ItemRowDemo />,
  },
  {
    id: 'shop-item',
    title: 'Shop Item',
    source: '118:98 · S1',
    note: 'Rows are at least 80px tall with a 32px check at every width. The whole row is the tap target.',
    render: () => <ShopItemDemo />,
  },
  {
    id: 'swipe-row',
    title: 'Swipe row',
    source: '27 · I5 touch',
    note: 'On a phone: swipe right to complete, swipe left for Edit and Delete, or swipe far left to delete.',
    render: () => <SwipeDemo />,
  },
  { id: 'stepper', title: 'Stepper', source: '14, 26', render: () => <StepperDemo /> },
  {
    id: 'action-row',
    title: 'Action row',
    source: '16, 23, 26',
    render: () => (
      <Stack>
        <ActionRow variant="card" icon="plus" iconBg="bg-brand-strong text-white" label="Add an item" description="Drop it into Weekly Groceries" />
        <ActionRow icon="edit" label="Rename list" />
        <ActionRow icon="trash" tone="danger" label="Delete list" />
      </Stack>
    ),
  },
  { id: 'nav-bar', title: 'Nav Bar', source: '114:176 · phone and tablet', render: () => <NavBarDemo /> },
  {
    id: 'top-bar',
    title: 'Top Bar',
    source: '114:177',
    render: () => (
      <div className="flex max-w-[390px] flex-col gap-4">
        <TopBar
          title="Weekly Groceries"
          subtitle="8 items · 5 remaining"
          left={{ icon: 'back', label: 'Back', onClick: () => undefined }}
          right={{ icon: 'more', label: 'List options', onClick: () => undefined }}
          className="!pt-2"
        />
        <TopBar title="Search" left={{ icon: 'back', label: 'Back', onClick: () => undefined }} className="!pt-2" />
      </div>
    ),
  },
  {
    id: 'sheet-header',
    title: 'Sheet Header',
    source: '114:191',
    render: () => (
      <div className="max-w-[390px] rounded-t-28 bg-surface p-5">
        <SheetHeader title="Add new item" onClose={() => undefined} />
      </div>
    ),
  },
  {
    id: 'toast',
    title: 'Toast',
    source: '114:197 · W4',
    render: () => (
      <Stack>
        <Toast message="Tomatoes marked as purchased" actionLabel="Undo" onAction={() => undefined} />
        <Toast icon="trash" message="Yam deleted" actionLabel="Undo" onAction={() => undefined} />
        <Toast icon="refresh" message="A new version of Shoppa is ready" actionLabel="Reload" onAction={() => undefined} />
        <Toast icon="link" message="Invite link copied" />
      </Stack>
    ),
  },
  {
    id: 'message-card',
    title: 'Message Card',
    source: '114:205',
    render: () => (
      <Stack>
        <MessageCard title="Family Groceries" body="Mum added 2 items" time="9:41 AM" />
        <MessageCard icon="wifi-off" title="You're offline" body="Changes are saved on this phone and will sync later." />
        <MessageCard
          icon="alert"
          title="Couldn't sync 3 changes"
          body="We'll keep trying."
          action={
            <button type="button" className="focus-ring min-h-11 shrink-0 rounded-12 px-3 type-label hover:bg-white/10">
              Try again
            </button>
          }
        />
      </Stack>
    ),
  },
  { id: 'settings-row', title: 'Settings Row', source: '114:234', render: () => <SettingsDemo /> },
  {
    id: 'sidebar',
    title: 'Sidebar',
    source: 'W6 · new for web, desktop 1024px+',
    render: () => (
      <div onClickCapture={(e) => (e.target as HTMLElement).closest('a') && e.preventDefault()}>
        <Sidebar inline active="lists" unread={2} onNewList={() => undefined} onSearch={() => undefined} />
      </div>
    ),
  },
  {
    id: 'dialog',
    title: 'Dialog and Sheet',
    source: 'W6 · new for web',
    render: () => <ModalDemo />,
  },
  { id: 'side-panel', title: 'Side panel', source: 'W6 · new for web', render: () => <SidePanelDemo /> },
  {
    id: 'hover-actions',
    title: 'Hover actions',
    source: 'I5 · new for web',
    note: 'Shown on Item Row at desktop widths. Resize the window to 1024px or wider and hover a row, or Tab into it.',
    render: () => <ItemRowDemo />,
  },
  {
    id: 'install-banner',
    title: 'Install banner',
    source: 'W2, W3 · new for web',
    render: () => (
      <Stack>
        <InstallBanner platform="prompt" onInstall={() => undefined} onDismiss={() => undefined} />
        <InstallBanner platform="ios" onDismiss={() => undefined} />
      </Stack>
    ),
  },
  {
    id: 'shortcut-hint',
    title: 'Keyboard shortcut hint',
    source: 'W7 · new for web',
    render: () => (
      <div className="flex flex-col gap-4">
        <Row>
          <span className="inline-flex items-center gap-2 type-body">
            New item <Kbd>N</Kbd>
          </span>
          <span className="inline-flex items-center gap-2 type-body">
            Search <Kbd>/</Kbd>
          </span>
          <span className="inline-flex items-center gap-2 type-body">
            Shortcuts <Kbd>?</Kbd>
          </span>
        </Row>
        <div className="max-w-[390px] rounded-20 bg-surface px-5 py-2">
          <ShortcutList />
        </div>
      </div>
    ),
  },
];
