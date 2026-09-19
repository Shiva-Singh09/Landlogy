import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from "react";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  leftIcon?: ReactNode;
  rightElement?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, required, leftIcon, rightElement, id, disabled, className = "", ...rest },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? `land-input-${generatedId}`;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;

  return (
    <div className="w-full">
      {label ? (
        <label
          htmlFor={inputId}
          className="mb-1.5 block text-sm font-semibold text-land-ink"
        >
          {label}
          {required ? (
            <span aria-hidden="true" className="ml-1 text-land-coral">
              *
            </span>
          ) : null}
        </label>
      ) : null}

      <div
        className={[
          "flex min-h-11 items-center gap-2 rounded-lg border bg-white px-3 transition-colors",
          error
            ? "border-land-coral/60 focus-within:border-land-coral focus-within:ring-2 focus-within:ring-land-coral/20"
            : "border-land-border-strong bg-white focus-within:border-land-emerald focus-within:ring-2 focus-within:ring-land-emerald/20",
          disabled ? "cursor-not-allowed bg-land-nested opacity-70" : "",
          className,
        ].join(" ")}
      >
        {leftIcon ? (
          <span className="inline-flex shrink-0 items-center text-land-ink/40" aria-hidden="true">
            {leftIcon}
          </span>
        ) : null}
        <input
          ref={ref}
          id={inputId}
          required={required}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={[hintId, errorId].filter(Boolean).join(" ") || undefined}
          className="min-w-0 flex-1 bg-transparent py-2.5 text-sm text-land-ink outline-none placeholder:text-land-ink/35 disabled:cursor-not-allowed"
          {...rest}
        />
        {rightElement ? (
          <span className="inline-flex shrink-0 items-center">{rightElement}</span>
        ) : null}
      </div>

      {error ? (
        <p id={errorId} role="alert" className="mt-1.5 flex items-start gap-1.5 text-[13px] font-medium text-land-coral">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="mt-0.5 shrink-0">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
            <path d="M12 8v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <circle cx="12" cy="16" r="1.2" fill="currentColor" />
          </svg>
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="mt-1.5 text-[13px] text-land-ink/50">
          {hint}
        </p>
      ) : null}
    </div>
  );
});
