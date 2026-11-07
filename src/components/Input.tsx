import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> & {
  label: string;
  helper?: string;
  /** Error message; switches the field to the Figma "Error" state. */
  error?: string;
  /** Trailing slot, e.g. a show-password IconButton or a unit chip. */
  trailing?: ReactNode;
  hideLabel?: boolean;
};

/**
 * Figma "Input" (114:21): label, 52px field, helper. Focused = ink border
 * (via :focus-within), Error = danger border and danger helper.
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, helper, error, trailing, hideLabel, className, id, ...rest },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const helpId = `${inputId}-help`;
  const message = error ?? helper;
  return (
    <div className={cn('flex w-full flex-col gap-2', className)}>
      <label htmlFor={inputId} className={cn('type-label text-body', hideLabel && 'sr-only')}>
        {label}
      </label>
      <div
        className={cn(
          'flex h-[52px] items-center gap-2 overflow-hidden rounded-12 bg-surface pl-4',
          trailing ? 'pr-1' : 'pr-4',
          error
            ? 'border-[1.5px] border-danger'
            : 'border border-line-strong focus-within:border-[1.5px] focus-within:border-line-focus',
        )}
      >
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={message ? helpId : undefined}
          className="h-full min-w-0 flex-1 bg-transparent type-body text-ink placeholder:text-tertiary focus:outline-none"
          {...rest}
        />
        {trailing}
      </div>
      {message ? (
        <p id={helpId} className={cn('type-caption', error ? 'text-danger' : 'text-secondary')} role={error ? 'alert' : undefined}>
          {message}
        </p>
      ) : null}
    </div>
  );
});
