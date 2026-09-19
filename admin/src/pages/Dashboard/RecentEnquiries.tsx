import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Eye } from "lucide-react";
import { Badge } from "../../components/ui/Badge";

import { EmptyState } from "../../components/ui/EmptyState";
import { formatDate } from "../../utils/format";
import type { BadgeVariant } from "../../components/ui/Badge";
import type { EnquiryStatus } from "../../types/enquiry";
import type { RecentEnquiry } from "../../types/dashboard";

const ENQUIRY_LABEL: Record<EnquiryStatus, string> = {
  new: "New",
  reviewed: "Reviewed",
  converted: "Converted",
  rejected: "Rejected",
};

const ENQUIRY_BADGE: Record<EnquiryStatus, BadgeVariant> = {
  new: "info",
  reviewed: "neutral",
  converted: "success",
  rejected: "danger",
};

interface RecentEnquiriesProps {
  enquiries: RecentEnquiry[];
  className?: string;
}

export function RecentEnquiries({
  enquiries,
  className = "",
}: RecentEnquiriesProps): ReactNode {
  if (enquiries.length === 0) {
    return (
      <EmptyState
        title="No recent activity"
        description="New enquiries will appear here."
        action={
          <Link to="/enquiries" className="inline-flex min-h-11 items-center rounded-xl border border-land-ink/10 bg-white px-4 text-sm font-semibold text-land-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-land-plum focus-visible:ring-offset-2">
            View all enquiries
          </Link>
        }
        className={className}
      />
    );
  }

    return (
    <ul role="list" className={["space-y-1.5", className].join(" ")}>
      {enquiries.slice(0, 3).map((enquiry) => {
        const contact = `${enquiry.phone}${enquiry.email ? ` · ${enquiry.email}` : ""}`;
        const details = [enquiry.intent, enquiry.property_type, enquiry.city]
          .filter((v): v is string => typeof v === "string" && v.length > 0)
          .join(" · ");
        return (
          <li
            key={enquiry.id}
            className="list-none rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-land-stone motion-reduce:transition-none"
          >
            <div className="flex min-w-0 items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-semibold text-land-ink">{enquiry.name}</p>
                <p className="mt-0.5 truncate text-xs text-land-ink/60">{contact}</p>
                {details ? <p className="mt-0.5 truncate text-xs text-land-ink/60">{details}</p> : null}
                <p className="mt-0.5 text-xs text-land-ink/55">{formatDate(enquiry.created_at)}</p>
              </div>
              <div className="flex min-w-0 shrink-0 items-center gap-2">
                <Badge variant={ENQUIRY_BADGE[enquiry.status]} size="sm">
                  {ENQUIRY_LABEL[enquiry.status]}
                </Badge>
                <Link
                  to={`/enquiries/${enquiry.id}`}
                  aria-label={`View enquiry from ${enquiry.name}`}
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
