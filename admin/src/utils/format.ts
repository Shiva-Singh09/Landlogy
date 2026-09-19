import { parseDecimal } from "./decimal";

/** Locale-aware number formatter (Indian grouping: 1,23,456). */
const NUMBER_FMT = new Intl.NumberFormat("en-IN");

/** Format a number with grouping. */
export function formatNumber(value: number): string {
  return NUMBER_FMT.format(value);
}

/**
 * Format an ISO timestamp into a human-readable local date
 * (e.g. "12 Sep 2024"). Returns "—" for null/invalid input.
 */
const DATE_FMT = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return DATE_FMT.format(date);
}

/**
 * Format a PostgreSQL DECIMAL value as Indian Rupees.
 * Reuses `parseDecimal` (the single normalization point for DECIMAL columns).
 * Null/undefined/unparseable values render as "Price on request".
 */
const INR = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export function formatPrice(value: string | number | null | undefined): string {
  const numeric = parseDecimal(value);
  if (numeric === null) return "Price on request";
  return INR.format(numeric);
}
