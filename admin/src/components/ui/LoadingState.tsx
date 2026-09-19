export type LoadingStateSize = "sm" | "md" | "lg";

export interface LoadingStateProps {
  label?: string;
  size?: LoadingStateSize;
  className?: string;
}

const sizeStyles: Record<LoadingStateSize, string> = {
  sm: "h-4 w-4",
  md: "h-7 w-7",
  lg: "h-10 w-10",
};

export function LoadingState({ label = "Loading…", size = "md", className = "" }: LoadingStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={label}
      className={["flex flex-col items-center justify-center gap-3 px-6 py-10 text-center", className].join(" ")}
    >
      <svg
        className={`${sizeStyles[size]} animate-spin text-land-emerald motion-reduce:animate-none`}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <circle
          className="opacity-20"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          d="M22 12a10 10 0 0 0-10-10"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
        />
      </svg>
      <p className="text-sm font-medium text-land-ink/55">{label}</p>
    </div>
  );
}
