import logoUrl from '@/assets/logo-mark.svg';
import { cn } from '@/lib/cn';

type LogoProps = {
  /** Height of the mark in px; width keeps the Figma 445:570 ratio. */
  height?: number;
  /** Show the mark on the #F4F8FB rounded tile used for the app icon (screen 69). */
  tile?: boolean;
  className?: string;
  label?: string;
};

export function Logo({ height = 32, tile = false, className, label = 'Shoppa' }: LogoProps) {
  const width = Math.round((height * 445) / 570);
  const img = <img src={logoUrl} width={width} height={height} alt={tile ? '' : label} />;
  if (!tile) return <span className={cn('inline-flex', className)}>{img}</span>;
  const box = Math.round(height / 0.6);
  return (
    <span
      role="img"
      aria-label={label}
      className={cn('inline-flex items-center justify-center bg-[#f4f8fb]', className)}
      style={{ width: box, height: box, borderRadius: Math.round(box * 0.23) }}
    >
      {img}
    </span>
  );
}
