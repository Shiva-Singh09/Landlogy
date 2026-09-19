import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  Activity as ActivityIcon,
  Building2,
  ClipboardList,
  Users,
} from "lucide-react";
import { EmptyState } from "../../components/ui/EmptyState";
import { formatDate } from "../../utils/format";
import type { ActivityEntity, ActivityItem } from "../../types/activity";
import type { UserRole } from "../../types/api";

/** Entity-type → icon mapping with a calm generic fallback. */
const ENTITY_ICONS: Record<string, typeof Building2> = {
  property: Building2,
  enquiry: ClipboardList,
  user: Users,
};

const ROLE_LABEL: Record<UserRole, string> = {
  admin: "Administrator",
  broker: "Broker",
  seller: "Seller",
};

function EntityIcon({ entity }: { entity: ActivityEntity }) {
  const Icon = ENTITY_ICONS[entity.type] ?? ActivityIcon;
  return (
    <span
      aria-hidden="true"
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-land-ink/[0.06] bg-land-stone text-land-ink/45"
    >
      <Icon size={16} />
    </span>
  );
}

/** Relative timestamp for recent items; falls back to the shared date format. */
function formatRelative(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const diffMinutes = Math.floor((Date.now() - date.getTime()) / 60000);
  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const hours = Math.floor(diffMinutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(value);
}

interface RecentActivityProps {
  activities: ActivityItem[];
  className?: string;
}

export function RecentActivity({
  activities,
  className = "",
}: RecentActivityProps): ReactNode {
  if (activities.length === 0) {
    return (
      <EmptyState
        title="No recent activity"
        description="Team and system activity will appear here."
        action={
          <Link
            to="/recent-activity"
            className="inline-flex min-h-9 items-center justify-center rounded-xl bg-land-emerald px-4 text-sm font-semibold text-white transition-colors hover:bg-land-jade"
          >
            View all activity
          </Link>
        }
        className={className}
      />
    );
  }

    return (
    <ul role="list" className={["space-y-1.5", className].join(" ")}>
      {activities.map((item) => (
        <li
          key={item.id}
          className="list-none rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-land-stone motion-reduce:transition-none"
        >
          <div className="flex min-w-0 items-start gap-3">
            <EntityIcon entity={item.entity} />
            <div className="min-w-0 flex-1 pt-0.5">
              <p className="text-sm font-semibold leading-snug text-land-ink [overflow-wrap:anywhere]">
                {item.description}
              </p>
              <p className="mt-0.5 text-xs text-land-ink/55">
                {item.actor
                  ? `${item.actor.name} · ${ROLE_LABEL[item.actor.role] ?? item.actor.role}`
                  : "System"}{" "}
                · {formatRelative(item.created_at)}
              </p>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
