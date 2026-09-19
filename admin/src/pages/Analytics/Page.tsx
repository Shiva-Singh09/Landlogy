import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Building2,
  CheckCircle,
  ClipboardList,
  Clock,
  IndianRupee,
  MapPin,
  RefreshCw,
  Tag,
} from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Card, CardHeader } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { LoadingState } from "../../components/ui/LoadingState";
import { PageHeader } from "../../components/ui/PageHeader";
import { getAnalytics } from "../../services/api/analyticsApi";
import type {
  AdminAnalytics,
  DistributionRow,
  EnquiryAnalytics,
  PropertyAnalytics,
} from "../../types/analytics";
import { formatNumber, formatPrice } from "../../utils/format";
import { StatusBreakdown } from "../Dashboard/StatusBreakdown";

// Approved semantic colours only (see index.css tokens): emerald = active,
// amber = pending/under review, coral = rejected, blue = sold, muted = dormant.
const propertyStatuses = [
  { key: "draft", label: "Draft", colorClass: "bg-land-subtle", color: "#7B7489" },
  { key: "under_review", label: "Under review", colorClass: "bg-land-amber", color: "#FFB400" },
  { key: "active", label: "Active", colorClass: "bg-land-emerald", color: "#00A884" },
  { key: "rejected", label: "Rejected", colorClass: "bg-land-coral", color: "#FF5A5F" },
  { key: "inactive", label: "Inactive", colorClass: "bg-land-subtle", color: "#7B7489" },
  { key: "sold", label: "Sold", colorClass: "bg-land-blue", color: "#3867FF" },
  { key: "archived", label: "Archived", colorClass: "bg-land-subtle", color: "#7B7489" },
] as const;

const enquiryFunnel = [
  { key: "new", label: "New", color: "bg-land-blue" },
  { key: "reviewed", label: "Reviewed", color: "bg-land-amber" },
  { key: "converted", label: "Converted", color: "bg-land-emerald" },
  { key: "rejected", label: "Rejected", color: "bg-land-coral" },
] as const;

const RANGE_LABEL = { 7: "last 7 days", 30: "last 30 days", 90: "last 90 days" } as const;

function Metric({ label, value, tone, icon, secondary }: { label: string; value: string; tone: string; icon: React.ReactNode; secondary?: boolean }) {
  return (
    <Card className={`min-w-0 border-l-[3px] p-5 ${tone} ${secondary ? "bg-land-stone/40" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-land-muted">{label}</p>
          <p className={`mt-2 font-display tabular-nums text-land-ink ${secondary ? "whitespace-nowrap text-2xl" : "whitespace-nowrap text-3xl"}`}>{value}</p>
        </div>
        <span className="shrink-0 rounded-lg bg-land-stone p-2 text-land-body">{icon}</span>
      </div>
    </Card>
  );
}

function percentage(value: number, total: number): number {
  return total > 0 ? Math.round((value / total) * 100) : 0;
}

function BarTrack({ share, colorClass }: { share: number; colorClass: string }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-land-stone">
      <div className={`h-full rounded-full ${colorClass}`} style={{ width: `${share}%` }} />
    </div>
  );
}

function FunnelRow({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const share = percentage(value, total);
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
        <span className="text-land-body">{label}</span>
        <span className="font-semibold tabular-nums text-land-ink">
          {formatNumber(value)} <span className="text-land-muted">({share}%)</span>
        </span>
      </div>
      <BarTrack share={share} colorClass={color} />
    </div>
  );
}

/** Ranked distribution list â€” the shared shape for every breakdown on this page. */
function BarList({ rows, colorClass, emptyLabel }: { rows: DistributionRow[]; colorClass: string; emptyLabel: string }) {
  const total = rows.reduce((sum, row) => sum + row.count, 0);
  if (rows.length === 0 || total === 0) return <p className="text-sm text-land-muted">{emptyLabel}</p>;
  return (
    <div className="space-y-4">
      {rows.map((row) => (
        <div key={row.label}>
          <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 break-words text-land-body">{row.label}</span>
            <span className="shrink-0 font-semibold tabular-nums text-land-ink">
              {formatNumber(row.count)} <span className="text-land-muted">({percentage(row.count, total)}%)</span>
            </span>
          </div>
          <BarTrack share={percentage(row.count, total)} colorClass={colorClass} />
        </div>
      ))}
    </div>
  );
}

function StatBlock({ label, value, large = false }: { label: string; value: string; large?: boolean }) {
  return (
    <div className="min-w-0 rounded-lg border border-land-border bg-land-stone px-4 py-3">
      <p className="truncate text-[11px] font-bold uppercase tracking-[0.14em] text-land-muted">{label}</p>
      <p className={`mt-1 whitespace-nowrap font-display tabular-nums text-land-ink ${large ? "text-2xl sm:text-3xl" : "text-xl sm:text-2xl"}`}>{value}</p>
    </div>
  );
}

function TableAverage({ rows }: { rows: Array<DistributionRow & { average: number | null }> }) {
  if (rows.length === 0) return <p className="text-sm text-land-muted">No priced listings in this range yet.</p>;
  return (
    <div className="min-w-0 overflow-x-auto rounded-lg border border-land-border/60">
      <table className="w-full min-w-[340px] text-sm">
        <thead>
          <tr className="border-b border-land-border bg-land-stone/60 text-left text-[11px] font-bold uppercase tracking-[0.12em] text-land-muted">
            <th className="min-w-[120px] whitespace-normal px-3 py-2 pr-3">Type</th>
            <th className="whitespace-nowrap px-3 py-2 pr-3 text-right">Listings</th>
            <th className="whitespace-nowrap px-3 py-2 text-right">Average asking</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-b border-land-border/60 last:border-0">
              <td className="min-w-[120px] whitespace-normal break-words px-3 py-2.5 pr-3 text-land-body">{row.label}</td>
              <td className="whitespace-nowrap px-3 py-2.5 pr-3 text-right font-semibold tabular-nums text-land-ink">{formatNumber(row.count)}</td>
              <td className="whitespace-nowrap px-3 py-2.5 text-right font-semibold tabular-nums text-land-ink">
                {row.average === null ? "—" : formatPrice(row.average)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Lifetime pipeline (current status of every property on record). */
function PropertyPipelineCard({ analytics }: { analytics: PropertyAnalytics }) {
  const counts = Object.fromEntries(
    propertyStatuses.map((status) => [status.key, analytics.byStatus[status.key].lifetime]),
  ) as Record<(typeof propertyStatuses)[number]["key"], number>;
  return (
    <Card>
      <CardHeader>
        <h2 className="text-xl font-semibold text-land-ink">Property pipeline</h2>
        <p className="text-sm text-land-body">
          Current status of all {formatNumber(analytics.total_lifetime)} properties on record (all time).
        </p>
      </CardHeader>
      <StatusBreakdown items={propertyStatuses} counts={counts} total={analytics.total_lifetime} />
    </Card>
  );
}

/** Lifetime funnel (current status of every enquiry on record). */
function EnquiryFunnelCard({ analytics }: { analytics: EnquiryAnalytics }) {
  return (
    <Card>
      <CardHeader>
        <h2 className="text-xl font-semibold text-land-ink">Enquiry funnel</h2>
        <p className="text-sm text-land-body">
          Current status of all {formatNumber(analytics.total_lifetime)} enquiries (all time).
        </p>
      </CardHeader>
      <div className="space-y-4">
        {enquiryFunnel.map(({ key, label, color }) => (
          <FunnelRow key={key} label={label} value={analytics.byStatus[key].lifetime} total={analytics.total_lifetime} color={color} />
        ))}
      </div>
    </Card>
  );
}

/** Range-scoped type / category / city mix, aggregated fully in the database. */
function PropertyMixCard({ analytics, rangeLabel }: { analytics: PropertyAnalytics; rangeLabel: string }) {
  return (
    <Card>
      <CardHeader>
        <h2 className="text-xl font-semibold text-land-ink">Property mix</h2>
        <p className="text-sm text-land-body">
          Type, category and city spread across the {formatNumber(analytics.total_range)} properties added in the {rangeLabel}.
        </p>
      </CardHeader>
      <div className="grid min-w-0 content-start gap-6 md:grid-cols-2 xl:grid-cols-3">
        <div className="min-w-0">
          <h3 className="mb-3 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-land-muted">
            <Tag size={14} aria-hidden="true" /> Type
          </h3>
          <BarList rows={analytics.type_distribution} colorClass="bg-land-emerald" emptyLabel="No properties added in this range yet." />
        </div>
        <div className="min-w-0">
          <h3 className="mb-3 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-land-muted">
            <Tag size={14} aria-hidden="true" /> Category
          </h3>
          <BarList rows={analytics.category_distribution} colorClass="bg-land-blue" emptyLabel="No categories captured in this range yet." />
        </div>
        <div className="min-w-0 md:col-span-2 xl:col-span-1">
          <h3 className="mb-3 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-land-muted">
            <MapPin size={14} aria-hidden="true" /> City
          </h3>
          <BarList rows={analytics.city_distribution} colorClass="bg-land-indigo" emptyLabel="No city data captured in this range yet." />
        </div>
      </div>
      <p className="mt-5 border-t border-land-border pt-3 text-xs text-land-muted">
        {formatNumber(analytics.distinct_cities)} distinct cities captured in the {rangeLabel}.
      </p>
    </Card>
  );
}

/** Range-scoped asking-price analysis, aggregated fully in the database. */
function PriceCard({ analytics, rangeLabel }: { analytics: PropertyAnalytics; rangeLabel: string }) {
  const { price, price_by_type } = analytics;
  return (
      <Card className="min-w-0">
        <CardHeader>
          <h2 className="text-xl font-semibold text-land-ink">Asking price</h2>
          <p className="text-sm text-land-body">
            Price spread across the {formatNumber(analytics.total_range)} properties added in the {rangeLabel}.
          </p>
        </CardHeader>
        <div className="min-w-0 space-y-6">
          <div className="min-w-0">
            <div className="mb-4 space-y-3">
              <StatBlock large label="Average asking price" value={price.average === null ? "—" : formatPrice(price.average)} />
              <div className="grid grid-cols-2 gap-3">
                <StatBlock label="Priced" value={formatNumber(price.with_price)} />
                <StatBlock label="Unpriced" value={formatNumber(price.without_price)} />
              </div>
            </div>
            <BarList rows={price.bands} colorClass="bg-land-amber" emptyLabel="No priced listings in this range yet." />
          </div>
          <div className="min-w-0 border-t border-land-border pt-5">
            <h3 className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-land-muted">
              Average asking price by type
            </h3>
            <TableAverage rows={price_by_type} />
          </div>
        </div>
      </Card>
  );
}

/** Age of listings still open, bucketed by the database for the full range. */
function ListingAgeCard({ analytics, rangeLabel }: { analytics: PropertyAnalytics; rangeLabel: string }) {
  const { listing_age } = analytics;
  return (
    <Card>
      <CardHeader>
        <h2 className="text-xl font-semibold text-land-ink">Listing age</h2>
        <p className="text-sm text-land-body">
          Age of {formatNumber(listing_age.total)} open listings created in the {rangeLabel}.
        </p>
      </CardHeader>
      <BarList rows={listing_age.buckets} colorClass="bg-land-indigo" emptyLabel="No open listings in this range yet." />
    </Card>
  );
}

/** Enquiry ageing + handling speed for the selected range. */
function EnquiryAgeingCard({ analytics, rangeLabel }: { analytics: EnquiryAnalytics; rangeLabel: string }) {
  const { ageing } = analytics;
  return (
    <Card>
      <CardHeader>
        <h2 className="text-xl font-semibold text-land-ink">Enquiry handling</h2>
        <p className="text-sm text-land-body">
          {formatNumber(ageing.unresolved_total)} unresolved enquiries in the {rangeLabel}, grouped by age.
        </p>
      </CardHeader>
      <BarList rows={ageing.buckets} colorClass="bg-land-coral" emptyLabel="No unresolved enquiries in this range yet." />
      <div className="mt-5 grid gap-3 border-t border-land-border pt-4 sm:grid-cols-2">
        <StatBlock label="Avg. handling time" value={ageing.average_handling_days === null ? "—" : `${ageing.average_handling_days.toFixed(1)} days`} />
        <StatBlock label="Handled enquiries" value={formatNumber(ageing.handled_count)} />
      </div>
    </Card>
  );
}

/** Factual operational insights derived only from the aggregated figures. */
function AttentionCard({ analytics, rangeLabel }: { analytics: AdminAnalytics; rangeLabel: string }) {
  const { properties, enquiries } = analytics;
  const items = [
    {
      tone: "bg-land-amber-lt",
      text: (
        <>
          <strong className="text-land-ink">{formatNumber(properties.byStatus.under_review.lifetime)}</strong> properties are waiting under review.
        </>
      ),
    },
    {
      tone: "bg-[#ebf0ff]",
      text: (
        <>
          <strong className="text-land-ink">{formatNumber(enquiries.byStatus.new.lifetime)}</strong> enquiries are still new and unhandled.
        </>
      ),
    },
    {
      tone: "bg-land-amber-lt",
      text: (
        <>
          <strong className="text-land-ink">{formatNumber(enquiries.ageing.buckets.at(-1)?.count ?? 0)}</strong> unresolved enquiries from the {rangeLabel} are older than 14 days.
        </>
      ),
    },
  ];
  return (
    <Card>
      <CardHeader>
        <h2 className="text-xl font-semibold text-land-ink">Attention</h2>
        <p className="text-sm text-land-body">Current operational items based on live aggregates.</p>
      </CardHeader>
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((item, index) => (
          <p key={index} className={`rounded-lg px-4 py-3 text-sm text-land-body ${item.tone}`}>
            {item.text}
          </p>
        ))}
      </div>
    </Card>
  );
}

export default function AnalyticsPage() {
  const [range, setRange] = useState<7 | 30 | 90>(30);
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    getAnalytics(range, controller.signal)
      .then((response) => {
        if (!controller.signal.aborted && response.ok && response.analytics) setAnalytics(response.analytics);
        else if (!controller.signal.aborted) setError(true);
      })
      .catch(() => !controller.signal.aborted && setError(true))
      .finally(() => !controller.signal.aborted && setLoading(false));
    return () => controller.abort();
  }, [range, attempt]);

  const retry = () => {
    setLoading(true);
    setError(false);
    setAttempt((value) => value + 1);
  };

  const selectRange = (value: 7 | 30 | 90) => {
    if (value !== range) {
      setLoading(true);
      setError(false);
      setRange(value);
    }
  };

  const rangeLabel = RANGE_LABEL[range];

  const summaryMetrics = analytics ? [
    {
      label: `New properties (${rangeLabel})`,
      value: formatNumber(analytics.properties.total_range),
      tone: "border-l-land-emerald",
      icon: <Building2 size={19} />,
    },
    {
      label: `New enquiries (${rangeLabel})`,
      value: formatNumber(analytics.enquiries.total_range),
      tone: "border-l-land-blue",
      icon: <ClipboardList size={19} />,
    },
    {
      label: `Conversion rate (${rangeLabel})`,
      value: analytics.enquiries.conversion_rate_range === null ? "—" : `${analytics.enquiries.conversion_rate_range}%`,
      tone: "border-l-land-emerald",
      icon: <ClipboardList size={19} />,
    },
    {
      label: `Rejection rate (${rangeLabel})`,
      value: analytics.enquiries.rejection_rate_range === null ? "—" : `${analytics.enquiries.rejection_rate_range}%`,
      tone: "border-l-land-coral",
      icon: <AlertTriangle size={19} />,
    },
  ] : [];

  const secondaryMetrics = analytics ? [
    {
      label: "Active listings (all time)",
      value: formatNumber(analytics.properties.byStatus.active.lifetime),
      tone: "border-l-land-emerald",
      icon: <CheckCircle size={19} />,
    },
    {
      label: "Under review (all time)",
      value: formatNumber(analytics.properties.byStatus.under_review.lifetime),
      tone: "border-l-land-amber",
      icon: <Clock size={19} />,
    },
    {
      label: "Avg. asking price (range)",
      value: analytics.properties.price.average === null ? "—" : formatPrice(analytics.properties.price.average),
      tone: "border-l-land-indigo",
      icon: <IndianRupee size={19} />,
    },
    {
      label: `Unresolved enquiries (range)`,
      value: formatNumber(analytics.enquiries.ageing.unresolved_total),
      tone: "border-l-land-coral",
      icon: <AlertTriangle size={19} />,
    },
  ] : [];

  return (
    <div className="mx-auto w-full min-w-0 max-w-[1440px] space-y-6">
      <PageHeader
        eyebrow="INSIGHTS"
        title="Analytics"
        description="Range-complete analytics aggregated in the database — every figure covers the full selected window, with lifetime pipeline totals labelled separately."
        actions={
          <div className="flex rounded-lg border border-land-border-strong bg-white p-1" aria-label="Analytics range">
            {([7, 30, 90] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => selectRange(value)}
                aria-pressed={range === value}
                className={`min-h-9 rounded px-3 text-xs font-bold ${range === value ? "bg-land-emerald text-white" : "text-land-muted hover:bg-land-stone"}`}
              >
                {value} days
              </button>
            ))}
          </div>
        }
      />
      {loading ? (
        <Card><LoadingState label="Loading analytics…" /></Card>
      ) : error ? (
        <Card>
          <EmptyState
            title="Unable to load analytics"
            description="Please try again shortly."
            action={<Button onClick={retry} leftIcon={<RefreshCw size={16} />}>Retry</Button>}
          />
        </Card>
      ) : analytics ? (
        <>
          <section aria-label="Analytics summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {summaryMetrics.map((metric) => (
              <Metric key={metric.label} {...metric} />
            ))}
          </section>
          <section aria-label="Portfolio health" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {secondaryMetrics.map((metric) => (
              <Metric key={metric.label} {...metric} secondary />
            ))}
          </section>
          <section className="grid gap-6 xl:grid-cols-2">
            <PropertyPipelineCard analytics={analytics.properties} />
            <EnquiryFunnelCard analytics={analytics.enquiries} />
          </section>
          <section className="grid items-start gap-6 xl:grid-cols-2">
            <PriceCard analytics={analytics.properties} rangeLabel={rangeLabel} />
            <PropertyMixCard analytics={analytics.properties} rangeLabel={rangeLabel} />
          </section>
          <section className="grid items-start gap-6 xl:grid-cols-2">
            <ListingAgeCard analytics={analytics.properties} rangeLabel={rangeLabel} />
            <EnquiryAgeingCard analytics={analytics.enquiries} rangeLabel={rangeLabel} />
          </section>
          <AttentionCard analytics={analytics} rangeLabel={rangeLabel} />
        </>
      ) : null}
    </div>
  );
}
