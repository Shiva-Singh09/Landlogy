import type { HTMLAttributes, ReactNode } from "react";

export type BadgeVariant =
  | "default"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "neutral"
  | "premium";

export type BadgeSize = "sm" | "md";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  children?: ReactNode;
}

type BadgeStyleSet = {
  border: string;
  bg: string;
  text: string;
  dot: string;
};

const badgeVariantStyles: Record<BadgeVariant, BadgeStyleSet> = {
  default: {
    border: "border-land-border",
    bg: "bg-land-card",
    text: "text-land-body",
    dot: "bg-land-muted",
  },
  success: {
    border: "border-land-emerald/25",
    bg: "bg-land-amber-lt/60",
    text: "text-land-emerald",
    dot: "bg-land-emerald",
  },
  warning: {
    border: "border-land-amber/30",
    bg: "bg-land-amber-lt",
    text: "text-land-amber-deep",
    dot: "bg-land-amber",
  },
  danger: {
    border: "border-land-coral/25",
    bg: "bg-[#fff1f2]",
    text: "text-land-coral",
    dot: "bg-land-coral",
  },
  info: {
    border: "border-land-blue/25",
    bg: "bg-[#ebf0ff]",
    text: "text-land-blue",
    dot: "bg-land-blue",
  },
  neutral: {
    border: "border-land-border",
    bg: "bg-land-card",
    text: "text-land-muted",
    dot: "bg-land-muted",
  },
  premium: {
    border: "border-land-indigo/25",
    bg: "bg-[#f0ebf8]",
    text: "text-land-indigo",
    dot: "bg-land-indigo",
  },
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: "gap-1 rounded px-2 py-0.5 text-[11px] leading-4",
  md: "gap-1.5 rounded px-2.5 py-1 text-xs leading-4",
};

export function Badge({
  variant = "default",
  size = "md",
  dot = false,
  className = "",
  children,
  ...rest
}: BadgeProps) {
  const styles = badgeVariantStyles[variant];
  return (
    <span
      className={[
        "inline-flex max-w-full items-center whitespace-nowrap font-sans font-semibold tracking-wide",
        styles.border,
        styles.bg,
        styles.text,
        sizeStyles[size],
        "border",
        className,
      ].join(" ")}
      {...rest}
    >
      {dot ? (
        <span
          aria-hidden="true"
          className={["h-1.5 w-1.5 shrink-0 rounded-full", styles.dot].join(" ")}
        />
      ) : null}
      <span className="min-w-0 truncate">{children}</span>
    </span>
  );
}
