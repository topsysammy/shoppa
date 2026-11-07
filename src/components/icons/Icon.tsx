import { iconPaths, type IconName } from './icon-paths';

export type { IconName };
export const iconNames = Object.keys(iconPaths) as IconName[];

type IconProps = {
  name: IconName;
  /** Rendered size in px. Strokes scale with size, as in Figma. */
  size?: number;
  /** Overrides the Figma stroke width (in 24px units). */
  strokeWidth?: number;
  className?: string;
  /** Gives the icon an accessible name. Leave empty when a parent has a label. */
  title?: string;
};

/** Inline SVG icon from the 44-icon Figma set (node 110:2). Uses currentColor. */
export function Icon({ name, size = 24, strokeWidth, className, title }: IconProps) {
  const paths = iconPaths[name];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      focusable="false"
    >
      {title ? <title>{title}</title> : null}
      {paths.map(([d, w], i) => (
        <path key={i} d={d} strokeWidth={strokeWidth ?? w} />
      ))}
    </svg>
  );
}
