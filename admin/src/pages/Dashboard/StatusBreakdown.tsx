import { formatNumber } from "../../utils/format";

export interface StatusItem<T extends string> {
  key: T;
  label: string;
  colorClass: string;
  color: string;
}

interface StatusBreakdownProps<T extends string> {
  items: readonly StatusItem<T>[];
  counts: Record<T, number>;
  total: number;
}

/** Actual counts remain readable independently of the decorative bars. */
export function StatusBreakdown<T extends string>({ items, counts, total }: StatusBreakdownProps<T>) {
  let accumulated = 0;
  const segments = items.map((item) => {
    const start = total ? accumulated / total * 100 : 0;
    accumulated += counts[item.key];
    return `${item.color} ${start}% ${total ? accumulated / total * 100 : 0}%`;
  }).join(", ");
  return (
    <div className="grid gap-5 sm:grid-cols-[112px_minmax(0,1fr)] sm:items-center">
      <div className="relative mx-auto flex h-28 w-28 items-center justify-center rounded-full" style={{ background: total ? `conic-gradient(${segments})` : "#f7f7f9" }}>
        <div className="flex h-20 w-20 flex-col items-center justify-center rounded-full bg-white text-center">
          <span className="text-2xl font-bold tabular-nums text-land-ink">{formatNumber(total)}</span>
          <span className="text-[10px] font-semibold uppercase tracking-wide text-land-ink/50">Total</span>
        </div>
      </div>
    <dl className="grid gap-x-5 gap-y-3 sm:grid-cols-2">
      {items.map(({ key, label, colorClass }) => (
        <div key={key}>
          <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-2">
            <dt className="text-sm text-land-ink/80">{label}</dt>
            <dd className="break-all text-sm font-bold tabular-nums text-land-ink">{formatNumber(counts[key])}</dd>
          </div>
          <div aria-hidden="true" className="h-1.5 overflow-hidden rounded-full bg-land-stone">
            <div className={`h-full rounded-full ${colorClass}`} style={{ width: `${total > 0 ? Math.min(100, counts[key] / total * 100) : 0}%` }} />
          </div>
        </div>
      ))}
    </dl>
    </div>
  );
}
