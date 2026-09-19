import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Eye } from "lucide-react";
import { Badge } from "../../components/ui/Badge";

import { EmptyState } from "../../components/ui/EmptyState";
import { formatDate, formatPrice } from "../../utils/format";
import type { BadgeVariant } from "../../components/ui/Badge";
import type { PropertyStatus } from "../../types/property";
import type { RecentProperty } from "../../types/dashboard";

const PROPERTY_LABEL: Record<PropertyStatus, string> = {
  draft: "Draft",
  under_review: "Under Review",
  active: "Active",
  rejected: "Rejected",
  inactive: "Inactive",
  sold: "Sold",
  archived: "Archived",
};

const PROPERTY_BADGE: Record<PropertyStatus, BadgeVariant> = {
  draft: "neutral",
  under_review: "info",
  active: "success",
  rejected: "danger",
  inactive: "neutral",
  sold: "premium",
  archived: "neutral",
};

function locationOf(property: RecentProperty): string | null {
  const parts = [property.city, property.state].filter(
    (p): p is string => typeof p === "string" && p.length > 0,
  );
  return parts.length > 0 ? parts.join(", ") : null;
}

interface RecentPropertiesProps {
  properties: RecentProperty[];
  className?: string;
}

export function RecentProperties({
  properties,
  className = "",
}: RecentPropertiesProps): ReactNode {
  if (properties.length === 0) {
    return (
      <EmptyState
        title="No recent properties"
        description="Newly added properties will appear here."
        action={
          <Link to="/properties/add" className="inline-flex min-h-11 items-center rounded-xl bg-land-emerald px-4 text-sm font-semibold text-white transition-colors hover:bg-land-jade focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-land-emerald focus-visible:ring-offset-2">
            Add Property
          </Link>
        }
        className={className}
      />
    );
  }

    return (
    <ul role="list" className={["space-y-1.5", className].join(" ")}>
      {properties.slice(0, 3).map((property) => {
        const location = locationOf(property);
        return (
          <li
            key={property.id}
            className="list-none rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-land-stone motion-reduce:transition-none"
          >
            <div className="flex min-w-0 items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-semibold text-land-ink">{property.title}</p>
                <p className="mt-0.5 truncate text-xs text-land-ink/60">
                  {location ? `${location} · ${formatDate(property.created_at)}` : formatDate(property.created_at)}
                </p>
              </div>
              <div className="flex min-w-0 shrink-0 items-center gap-2">
                <span className="truncate text-sm font-medium text-land-ink" title={formatPrice(property.asking_price)}>
                  {formatPrice(property.asking_price)}
                </span>
                <Badge variant={PROPERTY_BADGE[property.status]} size="sm">
                  {PROPERTY_LABEL[property.status]}
                </Badge>
                <Link
                  to={`/properties/${property.id}`}
                  aria-label={`View ${property.title}`}
                  className="inline-flex min-h-9 min-w-[64px] shrink-0 items-center justify-center gap-1.5 rounded-lg px-2.5 text-sm font-semibold text-land-plum transition-colors hover:bg-land-page focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-land-emerald/30 motion-reduce:transition-none"
                >
                  <Eye size={15} aria-hidden="true" /> View
                </Link>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
