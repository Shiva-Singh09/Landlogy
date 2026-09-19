import { Card } from "../../components/ui/Card";
import { Skeleton } from "../../components/ui/Skeleton";

/** Mirrors the loaded layout without presenting placeholder records as data. */
export function DashboardSkeleton() {
  return (
    <div role="status" aria-label="Loading dashboard" className="space-y-6 sm:space-y-8">
      <span className="sr-only">Loading dashboard…</span>
      <div aria-hidden="true" className="space-y-6 sm:space-y-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <Card key={index} className="flex min-w-0 items-center gap-4">
              <Skeleton className="h-10 w-10 shrink-0" />
              <div className="min-w-0 flex-1 space-y-3">
                <Skeleton className="h-7 w-16 max-w-full" />
                <Skeleton className="h-4 w-full" />
              </div>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-2">
          {[7, 4].map((count) => (
            <Card key={count} className="min-w-0 space-y-4">
              <Skeleton className="mb-6 h-7 w-3/4" />
              {Array.from({ length: count }, (_, index) => (
                <div key={index} className="space-y-2">
                  <Skeleton className="h-5 w-1/2" />
                  <Skeleton className="h-1.5 w-full" />
                </div>
              ))}
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-2">
          {[0, 1].map((index) => (
            <Card key={index} className="min-w-0 space-y-5">
              <Skeleton className="h-7 w-3/4" />
              {Array.from({ length: 5 }, (_, row) => (
                <div key={row} className="space-y-3 border-t border-land-ink/5 pt-4">
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-11 w-full" />
                </div>
              ))}
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}