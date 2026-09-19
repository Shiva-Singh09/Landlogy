import type { SVGProps } from "react";

/**
 * LANDLOGY brand lockup — single source of truth for admin branding.
 *
 * A-symbol geometry is IMMUTABLE (exact supplied coordinates):
 *   path  M32 10 L56 57 H47.5 L32 20.4 L16.5 57 H8 Z
 *   grid  4 squares at (27.2|32.7, 42.9|47.4), 4.1x4.1 rx 0.6
 * Only the `fill` colors change per surface:
 *   light background → A #74B743, grid #0F1B75
 *   dark background  → A white, grid white (both, never one)
 * - Full lockup (default): exact A-mark + LANDLOGY wordmark + REAL ESTATE
 *   ECOSYSTEM tagline.
 * - Compact (`variant="mark"`): the exact A-mark alone.
 */
export type BrandLockupProps = {
  variant?: "lockup" | "mark";
  tone?: "light" | "dark";
  className?: string;
} & Omit<SVGProps<SVGSVGElement>, "children" | "viewBox">;

const MARK_FILL: Record<"light" | "dark", string> = {
  light: "#74B743",
  dark: "#FFFFFF",
};

const GRID_FILL: Record<"light" | "dark", string> = {
  light: "#0F1B75",
  dark: "#FFFFFF",
};

const WORDMARK_FILL: Record<"light" | "dark", string> = {
  light: "#FFFFFF",
  dark: "var(--ink, #191724)",
};

function AMark({ tone }: { tone: "light" | "dark" }) {
  return (
    <>
      <path d="M32 10 L56 57 H47.5 L32 20.4 L16.5 57 H8 Z" fill={MARK_FILL[tone]} />
      <g fill={GRID_FILL[tone]}>
        <rect x="27.2" y="47.4" width="4.1" height="4.1" rx="0.6" />
        <rect x="32.7" y="47.4" width="4.1" height="4.1" rx="0.6" />
        <rect x="27.2" y="42.9" width="4.1" height="4.1" rx="0.6" />
        <rect x="32.7" y="42.9" width="4.1" height="4.1" rx="0.6" />
      </g>
    </>
  );
}

export function BrandLockup({
  variant = "lockup",
  tone = "light",
  className,
  role = "img",
  ...rest
}: BrandLockupProps) {
  if (variant === "mark") {
    return (
      <svg
        viewBox="0 0 64 64"
        className={className}
        role={role}
        aria-label="LANDLOGY"
        {...rest}
      >
        <AMark tone={tone} />
      </svg>
    );
  }

  const ink = WORDMARK_FILL[tone];
  return (
    <svg
      viewBox="0 0 248 64"
      className={className}
      role={role}
      aria-label="LANDLOGY — Real Estate Ecosystem"
      {...rest}
    >
      <AMark tone={tone} />
      <text
        x="70"
        y="35"
        fill={ink}
        fontFamily="'DM Serif Display', Georgia, serif"
        fontSize="26"
        letterSpacing="3.5"
      >
        LANDLOGY
      </text>
      <text
        x="72"
        y="52"
        fill={tone === "light" ? "#FFFFFF" : "var(--amber-deep, #7A5200)"}
        fontFamily="Manrope, Arial, sans-serif"
        fontSize="9.5"
        fontWeight="700"
        letterSpacing="3.1"
      >
        REAL ESTATE ECOSYSTEM
      </text>
    </svg>
  );
}

export default BrandLockup;
