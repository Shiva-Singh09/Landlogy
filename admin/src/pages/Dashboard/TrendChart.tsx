import {
  useId,
  useRef,
  useState,
  type ReactNode,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { EmptyState } from "../../components/ui/EmptyState";
import { formatNumber } from "../../utils/format";
import type { DashboardTrendPoint } from "../../types/dashboard";

interface TrendChartProps {
  label: string;
  points: DashboardTrendPoint[];
  color: string;
}

function formatTick(date: string): string {
  const value = new Date(`${date}T00:00:00Z`);
  return Number.isNaN(value.getTime())
    ? date
    : new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" }).format(value);
}

/** Pick evenly spaced x-axis tick indices, always keeping the first and last labels visible. */
function pickLabelIndexes(count: number, target = 5): number[] {
  if (count <= target) return [...Array(count).keys()];
  const step = Math.ceil(count / target);
  const indexes = new Set<number>([0, count - 1]);
  for (let i = 0; i < count; i += step) indexes.add(i);
  return [...indexes].sort((a, b) => a - b);
}

/** A dependency-free chart for actual daily aggregate data. */
export function TrendChart({ label, points, color }: TrendChartProps): ReactNode {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const tooltipId = useId();
  const [hovered, setHovered] = useState(-1);
  const [anchor, setAnchor] = useState<{ left: number; top: number; below: boolean } | null>(null);
  if (points.length === 0 || points.every(({ count }) => count === 0)) {
    return <EmptyState title={`No ${label.toLowerCase()} in this period`} description="Try a longer time range." />;
  }

  const width = 600;
  const height = 210;
  const padding = { top: 22, right: 12, bottom: 36, left: 30 };
  const max = Math.max(...points.map(({ count }) => count), 1);
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  const zeroY = padding.top + innerHeight;
  const total = points.reduce((sum, point) => sum + point.count, 0);
  const coordinates = points.map((point, index) => {
    const x = padding.left + (points.length === 1 ? innerWidth / 2 : (index / (points.length - 1)) * innerWidth);
    const y = zeroY - (point.count / max) * innerHeight;
    return { ...point, x, y };
  });
  const line = coordinates.map(({ x, y }, index) => `${index === 0 ? "M" : "L"}${x} ${y}`).join(" ");
  const area = `${line} L ${coordinates.at(-1)?.x ?? padding.left} ${zeroY} L ${coordinates[0]?.x ?? padding.left} ${zeroY} Z`;
  const labelIndexes = pickLabelIndexes(points.length);

  const onMove = (event: ReactMouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * width;
    let nearest = 0;
    let best = Infinity;
    coordinates.forEach((point, index) => {
      const distance = Math.abs(point.x - x);
      if (distance < best) {
        best = distance;
        nearest = index;
      }
    });
    setHovered(nearest);
    const nearestPoint = coordinates[nearest];
    setAnchor({
      left: Math.min(Math.max((nearestPoint.x / width) * 100, 14), 86),
      top: Math.min(Math.max((nearestPoint.y / height) * 100, 8), 92),
      below: nearestPoint.y < padding.top + innerHeight / 2,
    });
  };

  const clearHover = () => {
    setHovered(-1);
    setAnchor(null);
  };

  return (
    <div className="min-w-0" aria-label={`${label} over time`}>
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <p className="text-sm font-semibold text-land-ink">{label} over time</p>
        <p className="text-xs text-land-ink/55 tabular-nums">{formatNumber(total)} created</p>
      </div>
      <div className="relative">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`}
          className="h-auto w-full"
          role="img"
          aria-label={`${label} trend chart`}
          aria-describedby={hovered >= 0 && coordinates[hovered] ? tooltipId : undefined}
          onMouseMove={onMove}
          onMouseLeave={clearHover}
        >
          {/* Gridlines */}
        <g stroke="var(--color-land-border)" fill="none" opacity="0.6">
          {[0, 0.5, 1].map((fraction) => {
            const y = zeroY - fraction * innerHeight;
            return <line key={fraction} x1={padding.left} x2={width - padding.right} y1={y} y2={y} strokeWidth={1} />;
          })}
          <line x1={padding.left} x2={width - padding.right} y1={zeroY} y2={zeroY} strokeWidth={1} />
        </g>
        <path d={area} fill={color} fillOpacity="0.10" />
        <path d={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        {/* Selective x-axis ticks + labels */}
        {coordinates.map(({ date, x, y }, index) => {
          const active = hovered === index;
          return (
            <g key={date}>
              <circle
                cx={x}
                cy={y}
                r={active ? 6 : 4}
                fill={active ? color : "var(--color-land-card)"}
                stroke={color}
                strokeWidth="2"
              />
            </g>
          );
        })}
        {/* Selective x-axis ticks + labels */}
        {labelIndexes.map((index) => {
          const point = coordinates[index];
          return (
            <g key={point.date}>
              <line x1={point.x} x2={point.x} y1={zeroY} y2={zeroY + 5} stroke="var(--color-land-border)" strokeWidth={1} />
              <text x={point.x} y={height - 8} textAnchor="middle" fill="var(--color-land-muted)" fontSize="10.5" fontFamily="Manrope, system-ui, sans-serif">
                {formatTick(point.date)}
              </text>
            </g>
          );
        })}
        {/* Hover guide stays in SVG; readable tooltip is HTML (never clipped, never black-on-black) */}
        {hovered >= 0 && coordinates[hovered] ? (
          <line
            x1={coordinates[hovered].x}
            x2={coordinates[hovered].x}
            y1={padding.top}
            y2={zeroY}
            stroke={color}
            strokeOpacity="0.35"
            strokeWidth={1}
            strokeDasharray="4 3"
          />
        ) : null}
        </svg>
        {hovered >= 0 && coordinates[hovered] && anchor ? (
          <div
            id={tooltipId}
            className="pointer-events-none absolute z-10 rounded-lg border border-land-border bg-white px-3 py-2 shadow-[0_4px_12px_rgba(0,0,0,0.08),0_1px_4px_rgba(0,0,0,0.06)]"
            style={{
              left: `${anchor.left}%`,
              top: `${anchor.top}%`,
              transform: anchor.below ? "translate(-50%, 12px)" : "translate(-50%, calc(-100% - 12px))",
            }}
          >
            <p className="whitespace-nowrap text-[11px] font-bold text-land-ink">{formatTick(coordinates[hovered].date)}</p>
            <p className="whitespace-nowrap text-xs tabular-nums text-land-body">
              {formatNumber(coordinates[hovered].count)} <span className="text-land-muted">{label.toLowerCase()}</span>
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
