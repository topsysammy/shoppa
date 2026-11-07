import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Logo } from './Logo';

type State = { error: Error | null };

/**
 * Last line of defence: if a screen crashes, show a calm recovery page
 * instead of a blank or frozen screen. Local data is untouched.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Shoppa crashed', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center canvas-gradient">
        <Logo height={44} tile label="" />
        <h1 className="type-title text-ink">Something went wrong</h1>
        <p className="max-w-[320px] type-body text-secondary">Your lists are safe on this device. Reload Shoppa to carry on.</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="focus-ring inline-flex h-[54px] items-center justify-center rounded-16 bg-brand-strong px-6 type-body-strong text-on-brand"
        >
          Reload
        </button>
      </main>
    );
  }
}
