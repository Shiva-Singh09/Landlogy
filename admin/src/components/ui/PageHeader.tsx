import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";

export interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  backTo?: string;
  backLabel?: string;
  className?: string;
}

function BackChevron() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M15 18l-6-6 6-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  backTo,
  backLabel = "Back",
  className = "",
}: PageHeaderProps) {
  const navigate = useNavigate();

  return (
    <div className={["mb-6 sm:mb-8", className].join(" ")}>
      {backTo ? (
        <button
          type="button"
          onClick={() => navigate(backTo)}
          className="mb-3 inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-semibold text-land-ink/60 transition-colors hover:bg-white hover:text-land-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-land-blue/40"
        >
          <BackChevron />
          {backLabel}
        </button>
      ) : null}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          {eyebrow ? (
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-land-emerald sm:text-xs">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="mt-1.5 text-2xl font-bold leading-[1.2] text-land-ink">
            {title}
          </h1>
          {description ? (
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-land-body">
              {description}
            </p>
          ) : null}
        </div>

        {actions ? (
          <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center lg:justify-end">
            {actions}
          </div>
        ) : null}
      </div>
    </div>
  );
}
