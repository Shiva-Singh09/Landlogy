export interface SkeletonProps {
  className?: string;
  rounded?: "sm" | "md" | "lg" | "xl" | "2xl" | "full";
  label?: string;
}

const roundedStyles: Record<NonNullable<SkeletonProps["rounded"]>, string> = {
  sm: "rounded-md",
  md: "rounded-lg",
  lg: "rounded-xl",
  xl: "rounded-2xl",
  "2xl": "rounded-3xl",
  full: "rounded-full",
};

export function Skeleton({ className = "", rounded = "lg", label }: SkeletonProps) {
  return (
    <div
      role="status"
      aria-label={label ?? "Loading content"}
      className={[
        "animate-pulse bg-land-ink/[0.07] motion-reduce:animate-none",
        roundedStyles[rounded],
        className || "h-4 w-full",
      ].join(" ")}
    >
      <span className="sr-only">{label ?? "Loading…"}</span>
    </div>
  );
}
