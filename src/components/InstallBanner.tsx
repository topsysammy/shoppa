import { cn } from '@/lib/cn';
import { Button } from './Button';
import { Icon } from './icons/Icon';
import { IconButton } from './IconButton';
import { Logo } from './Logo';

type InstallBannerProps = {
  /** "prompt" uses the browser install prompt (requirement W2); "ios" shows the Add to Home Screen guide (W3). */
  platform: 'prompt' | 'ios';
  onInstall?: () => void;
  /** W2: dismissing hides the banner for 14 days (timing handled by the caller). */
  onDismiss: () => void;
  className?: string;
};

/**
 * Install banner: requirement W2 (install prompt, Figma screen W1 to design)
 * and W3 (iOS Add to Home Screen guide, screen W2 to design). Not in Figma
 * yet, so it is built from existing tokens and components.
 */
export function InstallBanner({ platform, onInstall, onDismiss, className }: InstallBannerProps) {
  return (
    <section
      aria-label="Install Shoppa"
      className={cn('relative flex w-full max-w-[420px] flex-col gap-4 rounded-20 border border-line bg-surface p-4 shadow-card', className)}
    >
      <div className="flex items-start gap-3 pr-10">
        <Logo height={29} tile className="shrink-0" label="" />
        <div className="flex flex-col gap-0.5">
          <h2 className="type-body-strong text-ink">Add Shoppa to your home screen</h2>
          <p className="type-caption text-secondary">
            Opens like an app, works without data, and keeps your lists safe on this phone.
          </p>
        </div>
      </div>
      <span className="absolute right-1.5 top-1.5">
        <IconButton variant="ghost" icon="close" label="Not now" onClick={onDismiss} />
      </span>
      {platform === 'prompt' ? (
        <Button icon="arrow-right" onClick={onInstall} size="md">
          Install app
        </Button>
      ) : (
        <ol className="flex flex-col gap-2 rounded-16 bg-muted p-3">
          <li className="flex items-center gap-3 type-body text-ink">
            <StepNumber n={1} />
            <span>
              Tap <Icon name="share" size={18} className="mx-0.5 inline align-[-3px]" title="Share" /> in Safari&rsquo;s toolbar
            </span>
          </li>
          <li className="flex items-center gap-3 type-body text-ink">
            <StepNumber n={2} />
            <span>
              Choose <strong className="font-semibold">Add to Home Screen</strong>
            </span>
          </li>
        </ol>
      )}
    </section>
  );
}

function StepNumber({ n }: { n: number }) {
  return (
    <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-surface type-small-strong text-ink" aria-hidden>
      {n}
    </span>
  );
}
