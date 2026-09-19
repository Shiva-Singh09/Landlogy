import { useEffect, useState } from "react";
import {
  Building2,
  CheckCircle,
  ChevronRight,
  ClipboardList,
  Clock,
  FileCheck,
  HandCoins,
  Inbox,
  Plus,
  RefreshCw,
} from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Card, CardContent, CardFooter, CardHeader } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { Skeleton } from "../../components/ui/Skeleton";
// import { PageHeader } from "../../components/ui/PageHeader";
import { ApiError } from "../../services/api/client";
import { getDashboardSummary } from "../../services/api/dashboardApi";
import { listActivity } from "../../services/api/activityApi";
import { getAdminMe } from "../../services/api/accountApi";
import { StatusBreakdown } from "./StatusBreakdown";
import { DashboardSkeleton } from "./DashboardSkeleton";
import { RecentProperties } from "./RecentProperties";
import { RecentEnquiries } from "./RecentEnquiries";
import { RecentActivity } from "./RecentActivity";
import { TrendChart } from "./TrendChart";
import { formatNumber } from "../../utils/format";
import type { DashboardSummary } from "../../types/dashboard";
import type { PropertyStatus } from "../../types/property";
import type { EnquiryStatus } from "../../types/enquiry";
import type { ActivityItem } from "../../types/activity";
import { Link } from "react-router-dom";

 type DashboardState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; summary: DashboardSummary };
type Tone = "blue" | "emerald" | "indigo" | "amber";

const TONE_CLASSES: Record<Tone, string> = {
  blue: "bg-[#ebf0ff] text-land-blue",
  emerald: "bg-[#e6f6f4] text-land-emerald",
  indigo: "bg-[#f0ebf8] text-land-plum",
  amber: "bg-[#fff8e6] text-land-mango",
};
/** Dashboard-only card treatment: subtle lift-on-hover using existing tokens
 * (ink-based shadow, 2px rise, 300ms premium ease, disabled under
 * prefers-reduced-motion). `group` only marks the card so the top accent
 * overlay can animate in sync — it adds no visual styles by itself. */
const CARD_LIFT =
  "group relative overflow-hidden transition-[transform,box-shadow,border-color] duration-[220ms] ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1 hover:shadow-[0_12px_28px_-10px_rgba(25,23,36,0.18),0_3px_10px_rgba(25,23,36,0.05)] motion-reduce:transition-none motion-reduce:hover:translate-y-0";

/** Restrained semantic hover-border accents per card tone (LANDLOGY tokens). */
const CARD_ACCENT_CLASS: Record<Tone, string> = {
  emerald: "hover:border-land-emerald/40",
  blue: "hover:border-land-blue/40",
  amber: "hover:border-land-amber/40",
  indigo: "hover:border-land-indigo/40",
};

/** Solid 3px top accent per tone — the single colored element per card,
 * clearly visible against the white card surface. */
const CARD_BAR_CLASS: Record<Tone, string> = {
  emerald: "bg-land-emerald",
  blue: "bg-land-blue",
  amber: "bg-land-amber",
  indigo: "bg-land-indigo",
};

/** KPI value emphasis per tone — mirrors the existing PulseTile treatment. */
const TONE_VALUE: Record<Tone, string> = {
  blue: "text-land-blue-deep",
  emerald: "text-land-emerald-deep",
  indigo: "text-land-indigo",
  amber: "text-land-amber-deep",
};

function CardAccentBar({ tone }: { tone: Tone }): React.ReactNode {
  return (
    <>
      {/* Existing static 3px accent — unchanged color/thickness at rest; it only
          dims while the hover overlay sweeps across so the sweep edge is visible. */}
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute inset-x-0 top-0 h-[3px] transition-[opacity] duration-[300ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:opacity-50 motion-reduce:transition-none ${CARD_BAR_CLASS[tone]}`}
      />
      {/* Hover sweep layer: same semantic color/height, expands left → full via
          transform only (no layout/reflow), then reverses on hover-out. */}
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute left-0 top-0 h-[3px] w-full origin-left scale-x-0 transition-[transform] duration-[300ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-x-100 motion-reduce:transition-none motion-reduce:group-hover:scale-x-0 ${CARD_BAR_CLASS[tone]}`}
      />
    </>
  );
}

/** Welcome hero — warm plum/ink → LANDLOGY blue gradient built purely from the
 * approved CSS tokens, with a decorative thin-circle texture on the right.
 * The greeting reuses the existing authenticated admin profile API. */
function WelcomeHero({ adminName }: { adminName: string | null }): React.ReactNode {
  return (
    <section
      aria-label="Portfolio overview"
      className="relative isolate overflow-hidden rounded-3xl border border-white/10 shadow-[0_24px_50px_-20px_rgba(25,23,36,0.5)]"
      style={{
        backgroundImage:
          "linear-gradient(105deg, color-mix(in srgb, var(--coral) 30%, var(--ink)) 0%, var(--indigo) 44%, var(--blue) 100%)",
      }}
    >
      {/* Decorative geometric texture — three large thin overlapping rings on the
          right side, partially clipped by the hero; purely presentational. */}
      <span aria-hidden="true" className="pointer-events-none absolute -right-24 -top-40 h-[26rem] w-[26rem] rounded-full border-2 border-white/20" />
      <span aria-hidden="true" className="pointer-events-none absolute -right-4 top-4 h-72 w-72 rounded-full border-2 border-white/15" />
      <span aria-hidden="true" className="pointer-events-none absolute -bottom-44 right-48 h-96 w-96 rounded-full border-2 border-white/20" />

      <div className="relative z-10 max-w-2xl p-8 sm:p-10 lg:px-14 lg:py-14">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-land-amber">Portfolio Overview</p>
        <h2 className="mt-4 font-display text-4xl leading-[1.05] text-white sm:text-5xl lg:text-6xl">
          Welcome back{adminName ? `, ${adminName}` : ""}
        </h2>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-white/80 sm:text-lg">
          Your live portfolio at a glance — properties, enquiries and the trends shaping them.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link to="/properties/add" className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-land-amber px-5 text-sm font-bold text-land-ink shadow-lg transition-colors duration-200 hover:bg-land-amber/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-land-indigo motion-reduce:transition-none">
            <Plus size={18} aria-hidden="true" /> Add Property
          </Link>
          <Link to="/enquiries" className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-5 text-sm font-semibold text-white transition-colors duration-200 hover:border-white/40 hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-land-indigo motion-reduce:transition-none">
            View Enquiries
          </Link>
        </div>
      </div>
    </section>
  );
}

const PROPERTY_STATUS_ITEMS = [
  { key: "draft", label: "Draft", colorClass: "bg-land-ink/40", color: "#85838c" },
  { key: "under_review", label: "Under Review", colorClass: "bg-land-blue", color: "#3867ff" },
  { key: "active", label: "Active", colorClass: "bg-land-emerald", color: "#00a884" },
  { key: "rejected", label: "Rejected", colorClass: "bg-land-coral", color: "#ff5a5f" },
  { key: "inactive", label: "Inactive", colorClass: "bg-land-ink/40", color: "#85838c" },
  { key: "sold", label: "Sold", colorClass: "bg-land-plum", color: "#45206b" },
  { key: "archived", label: "Archived", colorClass: "bg-land-mango", color: "#ffb400" },
] as const satisfies ReadonlyArray<{
  key: PropertyStatus;
  label: string;
  colorClass: string;
  color: string;
}>;

const ENQUIRY_STATUS_ITEMS = [
  { key: "new", label: "New", colorClass: "bg-land-azure", color: "#2480ff" },
  { key: "reviewed", label: "Reviewed", colorClass: "bg-land-ink/40", color: "#85838c" },
  { key: "converted", label: "Converted", colorClass: "bg-land-emerald", color: "#00a884" },
  { key: "rejected", label: "Rejected", colorClass: "bg-land-coral", color: "#ff5a5f" },
] as const satisfies ReadonlyArray<{
    key: EnquiryStatus;
  label: string;
  colorClass: string;
  color: string;
}>;

function KpiCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: Tone;
}): React.ReactNode {
  return (
    <Card className={`relative overflow-hidden ${CARD_LIFT} ${CARD_ACCENT_CLASS[tone]} flex min-h-[84px] min-w-0 items-center gap-3 p-4!`}>
      <CardAccentBar tone={tone} />
      <span
        aria-hidden="true"
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${TONE_CLASSES[tone]}`}>
        {icon}
      </span>
      <CardContent className="min-w-0 py-0">
        <p className={`font-display text-3xl tabular-nums ${TONE_VALUE[tone]}`}>{value}</p>
        <p className="mt-1 text-sm font-medium text-land-ink">{label}</p>
      </CardContent>
    </Card>
  );
}

function DashboardError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}): React.ReactNode {
  return (
    <Card className={CARD_LIFT}>
      <CardContent className="py-8">
        <EmptyState
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
              <path d="M12 8v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <circle cx="12" cy="16" r="1.2" fill="currentColor" />
            </svg>
          }
          title="Unable to load dashboard"
          description={message}
          action={
            <Button onClick={onRetry} leftIcon={<RefreshCw size={16} />}>
              Retry
            </Button>
          }
        />
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const [state, setState] = useState<DashboardState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [range, setRange] = useState<7 | 30 | 90>(30);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [activityError, setActivityError] = useState(false);
  const [activityLoading, setActivityLoading] = useState(true);
  const [adminName, setAdminName] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    getDashboardSummary(range, controller.signal).then((response) => {
      if (controller.signal.aborted) return;
      if (!response?.ok || !response.summary) throw new Error("Invalid summary");
      setState({ status: "success", summary: response.summary });
    }).catch((error: unknown) => {
      if (controller.signal.aborted) return;
      // Never render arbitrary backend error strings or response bodies.
      const message = error instanceof ApiError && error.status === 401
        ? "Your session has expired. Please sign in again."
        : error instanceof ApiError && error.status === 403
          ? "An administrator account is required to view this dashboard."
          : "We couldn't retrieve your overview. Please try again shortly.";
      setState({ status: "error", message });
    });
    return () => controller.abort();
  }, [attempt, range]);

  useEffect(() => {
    const controller = new AbortController();
    listActivity({ limit: 5 }, controller.signal).then((response) => {
      if (!controller.signal.aborted && response.ok) {
        setActivities(response.activities);
        setActivityError(false);
        setActivityLoading(false);
      }
    }).catch(() => {
      if (!controller.signal.aborted) {
        setActivityError(true);
        setActivityLoading(false);
      }
    });
    return () => controller.abort();
  }, [attempt]);

  // Hero greeting name — live from the existing authenticated admin profile API.
  useEffect(() => {
    const controller = new AbortController();
    getAdminMe(controller.signal).then((response) => {
      if (!controller.signal.aborted && response.ok) setAdminName(response.user.name);
    }).catch(() => {
      // Without the profile the hero simply greets without a name — nothing is faked.
    });
    return () => controller.abort();
  }, []);

  const retry = () => {
    setState({ status: "loading" });
    setActivityLoading(true);
    setAttempt((value) => value + 1);
  };

  return (
    <div className="mx-auto w-full min-w-0 max-w-[1440px] space-y-6 sm:space-y-8">
      {/* <PageHeader eyebrow="LANDLOGY ADMIN" title="Dashboard"
        description="A clear overview of your property ecosystem." /> */}
      {/* <nav aria-label="Quick actions" className="flex flex-wrap gap-2">
        <Link to="/properties/add" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-land-emerald px-4 text-sm font-semibold text-white transition-colors hover:bg-land-jade focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-land-emerald focus-visible:ring-offset-2">
          <Plus size={18} aria-hidden="true" /> Add Property
        </Link>
        <Link to="/properties" className={actionLink}>View Properties</Link>
        <Link to="/enquiries" className={actionLink}>View Enquiries</Link>
      </nav> */}
      <WelcomeHero adminName={adminName} />
      {state.status === "loading" ? <DashboardSkeleton /> : state.status === "error" ? (
        <div role="alert"><DashboardError message={state.message} onRetry={retry} /></div>
      ) : (
        <>
          <section aria-label="Key metrics" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard label="Total Properties" value={formatNumber(state.summary.properties.total)} icon={<Building2 size={22} />} tone="indigo" />
            <KpiCard label="Active Properties" value={formatNumber(state.summary.properties.byStatus.active)} icon={<CheckCircle size={22} />} tone="emerald" />
            <KpiCard label="Under Review Properties" value={formatNumber(state.summary.properties.byStatus.under_review)} icon={<Clock size={22} />} tone="amber" />
            <KpiCard label="Total Enquiries" value={formatNumber(state.summary.enquiries.total)} icon={<ClipboardList size={22} />} tone="blue" />
          </section>
          <div className="grid grid-cols-1 items-stretch gap-6 xl:grid-cols-2">
            <Card className={`relative overflow-hidden ${CARD_LIFT} ${CARD_ACCENT_CLASS.emerald} flex min-w-0 flex-col`}>
              <CardAccentBar tone="emerald" />
              <CardHeader><h2 className="text-xl font-semibold">Property Status Overview</h2><p className="text-sm text-land-body">Current distribution across the portfolio.</p></CardHeader>
              <StatusBreakdown items={PROPERTY_STATUS_ITEMS} counts={state.summary.properties.byStatus} total={state.summary.properties.total} />
            </Card>
            <Card className={`relative overflow-hidden ${CARD_LIFT} ${CARD_ACCENT_CLASS.blue} flex min-w-0 flex-col`}>
              <CardAccentBar tone="blue" />
              <CardHeader><h2 className="text-xl font-semibold">Enquiry Overview</h2><p className="text-sm text-land-body">Current status of incoming enquiries.</p></CardHeader>
              <StatusBreakdown items={ENQUIRY_STATUS_ITEMS} counts={state.summary.enquiries.byStatus} total={state.summary.enquiries.total} />
            </Card>
          </div>
          <section aria-label="Portfolio trends" className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><h2 className="text-xl font-semibold text-land-ink">Portfolio Trends</h2><p className="text-sm text-land-body">New records created in the selected period.</p></div>
              <div className="flex rounded-lg border border-land-border-strong bg-white p-1" aria-label="Trend range">
                {([7, 30, 90] as const).map((value) => <button key={value} type="button" onClick={() => setRange(value)} className={`min-h-9 rounded px-3 text-xs font-bold ${range === value ? "bg-land-emerald text-white" : "text-land-muted hover:bg-land-nested"}`}>{value} Days</button>)}
              </div>
            </div>
            <div className="grid grid-cols-1 items-stretch gap-6 xl:grid-cols-2">
              <Card className={`relative overflow-hidden ${CARD_LIFT} ${CARD_ACCENT_CLASS.emerald} min-w-0`}><CardAccentBar tone="emerald" /><TrendChart label="Properties" points={state.summary.trends.properties} color="#00a884" /></Card>
              <Card className={`relative overflow-hidden ${CARD_LIFT} ${CARD_ACCENT_CLASS.blue} min-w-0`}><CardAccentBar tone="blue" /><TrendChart label="Enquiries" points={state.summary.trends.enquiries} color="#3867ff" /></Card>
            </div>
          </section>
          <div className="grid grid-cols-1 items-stretch gap-6 xl:grid-cols-2">
            <Card className={`relative overflow-hidden ${CARD_LIFT} ${CARD_ACCENT_CLASS.amber} flex min-w-0 flex-col`}>
              <CardAccentBar tone="amber" />
              <CardHeader><h2 className="text-xl font-semibold">Business Pulse</h2><p className="text-sm text-land-body">Live operational snapshot.</p></CardHeader>
                            <div className="grid flex-1 content-start grid-cols-2 gap-3 lg:grid-cols-4">
                <PulseTile label="Active" value={state.summary.properties.byStatus.active} icon={<Building2 size={17} aria-hidden="true" />} wrapClass="bg-[#e6f6f4] text-land-emerald" valueClass="text-land-emerald-deep" barClass="bg-land-emerald" />
                <PulseTile label="In review" value={state.summary.properties.byStatus.under_review} icon={<FileCheck size={17} aria-hidden="true" />} wrapClass="bg-[#fff8e6] text-land-amber-deep" valueClass="text-land-amber-deep" barClass="bg-land-amber" />
                <PulseTile label="New enquiries" value={state.summary.enquiries.byStatus.new} icon={<Inbox size={17} aria-hidden="true" />} wrapClass="bg-[#ebf0ff] text-land-blue" valueClass="text-land-blue-deep" barClass="bg-land-blue" />
                <PulseTile label="Converted" value={state.summary.enquiries.byStatus.converted} icon={<HandCoins size={17} aria-hidden="true" />} wrapClass="bg-[#f0ebf8] text-land-indigo" valueClass="text-land-indigo" barClass="bg-land-indigo" />
              </div>
            </Card>
            <Card className={`relative overflow-hidden ${CARD_LIFT} ${CARD_ACCENT_CLASS.indigo} flex min-w-0 flex-col`}>
              <CardAccentBar tone="indigo" />
              <CardHeader><h2 className="text-xl font-semibold">Recent Activity</h2><p className="text-sm text-land-body">Latest team and system updates.</p></CardHeader>
              <div className="flex-1">{activityLoading ? <div className="space-y-4" aria-label="Loading recent activity">{[0, 1, 2].map((item) => <div key={item} className="flex gap-3"><Skeleton className="h-9 w-9 shrink-0" /><div className="flex-1 space-y-2"><Skeleton className="h-4 w-4/5" /><Skeleton className="h-3 w-2/5" /></div></div>)}</div> : activityError ? <EmptyState title="Unable to load activity" description="Please try again shortly." action={<Button variant="secondary" onClick={retry}>Retry</Button>} /> : <RecentActivity activities={activities} />}</div>
                        <CardFooter>
            <Link to="/recent-activity" className={actionLink}>
              View All Activity <ChevronRight size={15} aria-hidden="true" className="ms-1.5 shrink-0" />
            </Link>
          </CardFooter>
            </Card>
          </div>
          <div className="grid grid-cols-1 items-stretch gap-6 xl:grid-cols-2">
            <Card className={`relative overflow-hidden ${CARD_LIFT} ${CARD_ACCENT_CLASS.emerald} flex min-w-0 flex-col`}>
              <CardAccentBar tone="emerald" />
              <CardHeader><h2 className="text-xl font-semibold">Recent Properties</h2><p className="text-sm text-land-body">The three newest additions.</p></CardHeader>
              <div className="flex-1"><RecentProperties properties={state.summary.recent.properties} /></div>
                        <CardFooter>
            <Link to="/properties" className={actionLink}>
              View All Properties <ChevronRight size={15} aria-hidden="true" className="ms-1.5 shrink-0" />
            </Link>
          </CardFooter>
            </Card>
            <Card className={`relative overflow-hidden ${CARD_LIFT} ${CARD_ACCENT_CLASS.blue} flex min-w-0 flex-col`}>
              <CardAccentBar tone="blue" />
              <CardHeader><h2 className="text-xl font-semibold">Recent Enquiries</h2><p className="text-sm text-land-body">The three most recently received enquiries.</p></CardHeader>
              <div className="flex-1"><RecentEnquiries enquiries={state.summary.recent.enquiries} /></div>
                        <CardFooter>
            <Link to="/enquiries" className={actionLink}>
              View All Enquiries <ChevronRight size={15} aria-hidden="true" className="ms-1.5 shrink-0" />
            </Link>
          </CardFooter>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function PulseTile({ label, value, icon, wrapClass, valueClass, barClass }: { label: string; value: number; icon: React.ReactNode; wrapClass: string; valueClass: string; barClass: string }) {
      return (
      <div className="group relative min-w-0 overflow-hidden rounded-xl border border-land-border bg-white p-3 transition-all duration-150 hover:-translate-y-0.5 hover:border-land-border-strong hover:shadow-[0_4px_12px_rgba(0,0,0,0.07)] motion-reduce:transition-none motion-reduce:hover:translate-y-0">
      <span aria-hidden="true" className={`absolute inset-x-0 top-0 h-[3px] opacity-80 ${barClass}`} />
      <span aria-hidden="true" className={`mt-0.5 flex h-7 w-7 items-center justify-center rounded-lg ${wrapClass}`}>{icon}</span>
      <p className={`mt-2 font-display text-[22px] leading-none tabular-nums ${valueClass}`}>{formatNumber(value)}</p>
      <p className="mt-1 text-[11px] font-semibold leading-tight text-land-muted">{label}</p>
    </div>
    );
}

const actionLink = "inline-flex min-h-11 items-center rounded-lg border border-land-border-strong bg-land-page px-4 text-sm font-semibold text-land-ink transition-colors duration-200 hover:border-land-emerald/40 hover:text-land-emerald-deep hover:bg-land-ink/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-land-emerald/20 focus-visible:ring-offset-2 motion-reduce:transition-none";
