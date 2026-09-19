/**
 * Single consistent place for handling PostgreSQL DECIMAL values.
 * Sequelize returns DECIMAL columns (`asking_price`, `latitude`, `longitude`,
 * `commission_value`) as strings, but callers may also pass numbers
 * (e.g. after local edits). Keep the raw `DecimalValue` in API types and
 * normalize with `parseDecimal` wherever a number is needed for display
 * or arithmetic.
 */

/** Raw shape of a DECIMAL column as received from the backend. */
export type DecimalValue = string | number | null | undefined;

/** Normalize a DECIMAL value to a finite number, or `null` when absent/invalid. */
export function parseDecimal(value: DecimalValue): number | null {
  if (value === null || value === undefined || value === "") return null;
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}
