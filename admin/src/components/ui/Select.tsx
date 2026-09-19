import { forwardRef, useId, type SelectHTMLAttributes } from "react";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "children"> {
  label?: string;
  hint?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, hint, error, required, options, placeholder = "Select an option", id, disabled, className = "", ...rest },
  ref,
) {
  const generatedId = useId();
  const selectId = id ?? `land-select-${generatedId}`;
  const hintId = hint ? `${selectId}-hint` : undefined;
  const errorId = error ? `${selectId}-error` : undefined;

  return (
    <div className="w-full">
      {label ? (
        <label
          htmlFor={selectId}
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

      <div className="relative">
        <select
          ref={ref}
          id={selectId}
          required={required}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={[hintId, errorId].filter(Boolean).join(" ") || undefined}
          className={[
            "min-h-11 w-full appearance-none rounded-lg border bg-white py-2.5 pl-3 pr-10 text-sm text-land-ink outline-none transition-colors",
            "focus-visible:ring-2",
            error
              ? "border-land-coral/60 focus:border-land-coral focus-visible:ring-land-coral/20"
              : "border-land-border-strong focus:border-land-emerald focus-visible:ring-land-emerald/20",
            "disabled:cursor-not-allowed disabled:bg-land-nested disabled:opacity-70",
            className,
          ].join(" ")}
          {...rest}
        >
          <option value="">{placeholder}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          ))}
        </select>
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-3 inline-flex items-center text-land-ink/40"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path
              d="M6 9l6 6 6-6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </div>

      {error ? (
        <p id={errorId} role="alert" className="mt-1.5 text-[13px] font-medium text-land-coral">
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
