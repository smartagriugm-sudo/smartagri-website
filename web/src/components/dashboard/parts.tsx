import { useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Minus,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { body, display } from "../../lib/fonts";
import {
  METRICS,
  STATUS_TONE,
  type MetricKey,
  type Zone,
  axisPercent,
  deltaOver,
  formatValue,
  round,
  seriesFor,
  statusOf,
  targetFor,
} from "../../lib/indoor-dashboard";

// Shared building blocks for the Indoor Farming dashboard.
//
// This is a self-contained application shell rendered inside the marketing
// page: sidebar, top bar, and a grid of live panels. It holds all of its own
// state and reads every number through lib/indoor-dashboard.ts.
//
// Hydration safety is the constraint that shapes this file. First paint uses a
// fixed playhead (INITIAL_TICK), so the server-rendered markup and the client's
// first render are byte-identical. Only after mount does the interval start
// advancing the clock, which is what gives the demo its live feel without any
// non-deterministic data.

/* ----------------------------------------------------------- primitives */

export function Panel({
  title,
  action,
  children,
  className = "",
  padded = true,
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <div
      className={`min-w-0 rounded-2xl border border-[#0B6477]/10 bg-white shadow-[0_1px_2px_rgba(8,49,58,0.04),0_10px_30px_rgba(8,49,58,0.06)] ${
        padded ? "p-5" : ""
      } ${className}`}
    >
      {title && (
        <div
          className={`flex flex-wrap items-center justify-between gap-3 mb-4 min-w-0 ${
            padded ? "" : "px-5 pt-5"
          }`}
        >
          <h3 className="text-[15px] font-medium text-neutral-900" style={display}>
            {title}
          </h3>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

export function Pill({
  active,
  onClick,
  children,
  tone,
}: {
  active?: boolean;
  onClick?: () => void;
  children: ReactNode;
  /** The parameter's own colour. Given one, the pill carries it so the reader
      can tell parameters apart before reading a single label. */
  tone?: string;
}) {
  const accentTone = tone ?? "#0B6477";
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors"
      style={{
        ...body,
        backgroundColor: active ? accentTone : `${accentTone}14`,
        color: active ? "#FFFFFF" : accentTone,
      }}
    >
      {children}
    </button>
  );
}

export function StatusDot({ status }: { status: keyof typeof STATUS_TONE }) {
  const tone = STATUS_TONE[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium"
      style={{ ...body, color: tone.color, backgroundColor: tone.bg }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: tone.color }} />
      {tone.label}
    </span>
  );
}

export function TrendChip({ dir, text }: { dir: "up" | "down" | "flat"; text: string }) {
  const Icon = dir === "up" ? TrendingUp : dir === "down" ? TrendingDown : Minus;
  const color = dir === "flat" ? "#8A94A6" : dir === "up" ? "#0E9F6E" : "#0B6477";
  return (
    <span
      className="inline-flex items-center gap-1 text-[11px] font-medium tabular-nums"
      style={{ ...body, color }}
    >
      <Icon className="w-3 h-3" />
      {text}
    </span>
  );
}

/* -------------------------------------------------------------- sparkline */

export function Sparkline({
  values,
  tone,
  width = 96,
  height = 30,
}: {
  values: number[];
  tone: string;
  width?: number;
  height?: number;
}) {
  if (values.length < 2) return null;
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const span = hi - lo || 1;
  const xy = values.map((v, i) => ({
    x: (i / (values.length - 1)) * width,
    // Leave a little headroom top and bottom so the stroke is never clipped.
    y: height - 3 - ((v - lo) / span) * (height - 6),
  }));
  const line = xy.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  // Closing the path down to the baseline is what turns the trend line into a
  // filled area: the eye reads the shaded mass as "how much", which a bare
  // stroke at this size does not carry.
  const area = `${line} L${width} ${height} L0 ${height} Z`;
  // Derived from the colour rather than random, so the id is identical on the
  // server and in the browser and hydration stays quiet.
  const gradientId = `spark-${tone.replace("#", "")}`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="shrink-0 overflow-visible"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={tone} stopOpacity="0.32" />
          <stop offset="100%" stopColor={tone} stopOpacity="0.03" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradientId})`} />
      <path
        d={line}
        fill="none"
        stroke={tone}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={xy[xy.length - 1].x} cy={xy[xy.length - 1].y} r="2.4" fill={tone} />
    </svg>
  );
}

/* ------------------------------------------------------------- day chart */

// The SVG holds only geometry. Axis labels are HTML positioned on top of it,
// because the chart stretches with `preserveAspectRatio="none"` so that it can
// fill any panel width at a fixed height, and that non-uniform scale squashes
// SVG <text> into an illegible smear on a narrow screen. HTML labels are
// immune to it and stay the same size at every breakpoint.

const W = 720;
const H = 240;
const INSET_T = 8;
const INSET_B = 8;
const PLOT_H = H - INSET_T - INSET_B;
// The chart no longer assumes a day. It plots whatever series it is handed and
// labels the x axis from the caller's tick list, which is what lets the same
// component draw 96 quarter-hour samples or 30 daily means.
export function DayChart({
  series,
  metricKey,
  tick,
  zone,
  ticks,
  labelAt,
}: {
  series: number[];
  metricKey: MetricKey;
  tick: number;
  zone: Zone;
  /** Indices that get an x axis label. */
  ticks: number[];
  labelAt: (i: number) => string;
}) {
  const n = series.length;
  const metric = METRICS[metricKey];
  const [lo, hi] = metric.axis;
  const [hover, setHover] = useState<number | null>(null);
  const plotRef = useRef<HTMLDivElement>(null);

  // Rounded at the source: it keeps the serialised SVG small and keeps every
  // derived percentage short enough to survive the browser's CSS round trip,
  // which is what the absolutely positioned labels and tooltip depend on.
  const x = (i: number) => round((i / Math.max(1, n - 1)) * W, 1);
  const y = (v: number) =>
    round(INSET_T + PLOT_H - ((Math.min(hi, Math.max(lo, v)) - lo) / (hi - lo)) * PLOT_H, 1);

  const pct = (value: number, total: number) => round((value / total) * 100);

  const linePath = useMemo(
    () => series.map((v, i) => `${i === 0 ? "M" : "L"}${x(i)} ${y(v)}`).join(" "),
    [series, lo, hi],
  );

  // The filled area stops at the playhead: everything to its right is the rest
  // of the modelled day, drawn faint so the demo never implies it has already
  // measured the future.
  const areaPath = useMemo(() => {
    const upTo = series.slice(0, tick + 1);
    if (upTo.length < 2) return "";
    const d = upTo.map((v, i) => `${i === 0 ? "M" : "L"}${x(i)} ${y(v)}`);
    return `${d.join(" ")} L${x(tick)} ${H} L0 ${H} Z`;
  }, [series, tick, lo, hi]);

  const solidPath = useMemo(
    () =>
      series
        .slice(0, tick + 1)
        .map((v, i) => `${i === 0 ? "M" : "L"}${x(i)} ${y(v)}`)
        .join(" "),
    [series, tick, lo, hi],
  );

  const band = targetFor(metricKey, zone);
  const bandTop = y(band[1]);
  const bandHeight = round(Math.max(0, y(band[0]) - bandTop), 1);
  const gridValues = [0, 0.25, 0.5, 0.75, 1].map((f) => lo + (hi - lo) * f);
  const marker = hover ?? tick;
  const gradientId = `grad-${metricKey}`;

  function onMove(event: React.MouseEvent<HTMLDivElement>) {
    const rect = plotRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return;
    const ratio = (event.clientX - rect.left) / rect.width;
    const i = Math.round(ratio * (n - 1));
    setHover(Math.min(n - 1, Math.max(0, i)));
  }

  const axisLabel = (v: number) =>
    metric.decimals > 1 ? v.toFixed(1) : String(Math.round(v));

  return (
    <div className="flex h-full flex-col">
      <div className="flex min-h-0 flex-1">
        {/* y axis gutter */}
        <div className="relative w-9 shrink-0">
          {gridValues.map((v) => (
            <span
              key={v}
              className="absolute right-1.5 -translate-y-1/2 text-[10px] text-neutral-400 tabular-nums"
              style={{ ...body, top: `${pct(y(v), H)}%` }}
            >
              {axisLabel(v)}
            </span>
          ))}
        </div>

        <div
          ref={plotRef}
          className="relative min-w-0 flex-1"
          onMouseMove={onMove}
          onMouseLeave={() => setHover(null)}
        >
          <svg
            viewBox={`0 0 ${W} ${H}`}
            preserveAspectRatio="none"
            className="h-full w-full touch-none"
            role="img"
            aria-label={`${metric.label}, in ${metric.unit || "index units"}`}
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={metric.tone} stopOpacity="0.28" />
                <stop offset="100%" stopColor={metric.tone} stopOpacity="0.02" />
              </linearGradient>
            </defs>

            {/* target band */}
            <rect x="0" y={bandTop} width={W} height={bandHeight} fill="#45DFB1" opacity="0.12" />

            {gridValues.map((v) => (
              <line
                key={v}
                x1="0"
                y1={y(v)}
                x2={W}
                y2={y(v)}
                stroke="#0B6477"
                strokeOpacity="0.08"
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
              />
            ))}

            {/* the rest of the modelled day */}
            <path
              d={linePath}
              fill="none"
              stroke={metric.tone}
              strokeOpacity="0.28"
              strokeWidth="1.5"
              strokeDasharray="3 4"
              vectorEffect="non-scaling-stroke"
            />

            {areaPath && <path d={areaPath} fill={`url(#${gradientId})`} />}
            <path
              d={solidPath}
              fill="none"
              stroke={metric.tone}
              strokeWidth="2.25"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />

            {/* playhead */}
            <line
              x1={x(marker)}
              y1="0"
              x2={x(marker)}
              y2={H}
              stroke="#0B6477"
              strokeOpacity="0.35"
              strokeWidth="1"
              strokeDasharray="2 3"
              vectorEffect="non-scaling-stroke"
            />
          </svg>

          {/* Marker and tooltip are HTML for the same reason as the labels:
              a circle drawn in the stretched viewBox would render as an oval. */}
          <span
            className="pointer-events-none absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white"
            style={{
              left: `${pct(x(marker), W)}%`,
              top: `${pct(y(series[marker]), H)}%`,
              backgroundColor: metric.tone,
            }}
          />
          <div
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full pb-2"
            style={{
              left: `${pct(x(marker), W)}%`,
              top: `${pct(y(series[marker]), H)}%`,
            }}
          >
            <div
              className="whitespace-nowrap rounded-lg border border-[#0B6477]/10 bg-white px-2.5 py-1.5 text-center shadow-[0_4px_14px_rgba(8,49,58,0.12)]"
              style={body}
            >
              <div className="text-[13px] font-semibold text-neutral-900 tabular-nums">
                {formatValue(metricKey, series[marker])}
                <span className="text-[11px] font-normal text-neutral-400"> {metric.unit}</span>
              </div>
              <div className="text-[10px] text-neutral-400 tabular-nums">{labelAt(marker)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* x axis */}
      <div className="relative ml-9 mt-1.5 h-4">
        {ticks.map((i, m) => (
          <span
            key={i}
            className={`absolute text-[10px] text-neutral-400 tabular-nums ${
              m === 0 ? "" : m === ticks.length - 1 ? "-translate-x-full" : "-translate-x-1/2"
            }`}
            style={{ ...body, left: `${pct(x(i), W)}%` }}
          >
            {labelAt(i)}
          </span>
        ))}
      </div>
    </div>
  );
}


/* ------------------------------------------------------------- ring gauge */

export function Ring({
  metricKey,
  value,
  zone,
}: {
  metricKey: MetricKey;
  value: number;
  zone: Zone;
}) {
  const metric = METRICS[metricKey];
  const status = statusOf(metricKey, value, zone);
  const band = targetFor(metricKey, zone);
  const pct = axisPercent(metricKey, value);
  const r = 26;
  const c = round(2 * Math.PI * r);
  return (
    <div className="flex items-center gap-3">
      <div className="relative w-[62px] h-[62px] shrink-0">
        <svg viewBox="0 0 62 62" className="w-[62px] h-[62px] -rotate-90">
          <circle cx="31" cy="31" r={r} fill="none" stroke="#EDF3F2" strokeWidth="6" />
          <circle
            cx="31"
            cy="31"
            r={r}
            fill="none"
            stroke={STATUS_TONE[status].color}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={round(c * (1 - pct / 100))}
          />
        </svg>
        <div
          className="absolute inset-0 flex items-center justify-center text-[13px] font-semibold text-neutral-900 tabular-nums"
          style={display}
        >
          {formatValue(metricKey, value)}
        </div>
      </div>
      <div className="min-w-0">
        <div className="text-[13px] font-medium text-neutral-800 truncate" style={body}>
          {metric.label}
        </div>
        <div className="text-[11px] text-neutral-400" style={body}>
          Target {band[0]} to {band[1]} {metric.unit}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- KPI card */

export function KpiCard({ zone, metricKey, tick }: { zone: Zone; metricKey: MetricKey; tick: number }) {
  const metric = METRICS[metricKey];
  const series = useMemo(() => seriesFor(zone, metricKey), [zone, metricKey]);
  const value = series[tick];
  const status = statusOf(metricKey, value, zone);
  const delta = deltaOver(zone, metricKey, tick);
  const window = series.slice(Math.max(0, tick - 23), tick + 1);

  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
        style={{ backgroundColor: `${metric.tone}1A` }}
      >
        <metric.icon className="w-[18px] h-[18px]" style={{ color: metric.tone }} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-medium text-neutral-400 truncate" style={body}>
          {metric.short}
        </div>
        <div className="flex items-baseline gap-1">
          <span
            className="text-[19px] font-semibold tracking-[-0.02em] tabular-nums"
            style={{
              ...display,
              // Neutral while the reading is where it should be, coloured only
              // when it is not. Removing the status chip freed the card, but a
              // card with no status signal at all would read as healthy even
              // while drifting, so the number itself carries it now.
              color: status === "optimal" ? "#171717" : STATUS_TONE[status].color,
            }}
          >
            {formatValue(metricKey, value)}
          </span>
          <span className="text-[11px] font-normal text-neutral-400" style={body}>
            {metric.unit}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <TrendChip
            dir={delta.dir}
            text={`${delta.diff > 0 ? "+" : ""}${delta.diff.toFixed(metric.decimals)} in 2 h`}
          />
        </div>
      </div>
      <div className="hidden sm:flex shrink-0 items-center">
        <Sparkline values={window} tone={metric.tone} width={104} height={38} />
      </div>
    </div>
  );
}

/* ---------------------------------------------------------- flow node card */

export function FlowNode({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-[#0B6477]/10 bg-[#F3F7F6] px-3 py-2.5">
      <Icon className="w-4 h-4 text-[#14919B] mb-1" />
      <div className="text-[10px] text-neutral-400 truncate" style={body}>
        {label}
      </div>
      <div
        className="text-[13px] font-semibold text-neutral-900 tabular-nums truncate"
        style={display}
      >
        {value}
      </div>
    </div>
  );
}



/* -------------------------------------------------------- metric bar row */

/**
 * One parameter as a horizontal bar.
 *
 * Each row is scaled to its own axis, not a shared one. pH 5.8, EC 2.4 and
 * dissolved oxygen 8.2 mg/L have nothing in common numerically, so putting them
 * on one axis would make the pH bar a stub and say nothing true about any of
 * them. Per-row scaling means the bar answers the only question that matters:
 * where does this reading sit inside its own working range.
 *
 * The target band is shaded on the track, so "inside the band" is something the
 * reader sees rather than something they have to work out from the numbers.
 */
export function MetricBar({
  metricKey,
  value,
  zone,
}: {
  metricKey: MetricKey;
  value: number;
  zone: Zone;
}) {
  const metric = METRICS[metricKey];
  const [lo, hi] = metric.axis;
  const span = hi - lo || 1;
  const at = (v: number) => round(((Math.min(hi, Math.max(lo, v)) - lo) / span) * 100, 1);

  const [bandLo, bandHi] = targetFor(metricKey, zone);
  const bandLeft = at(bandLo);
  const bandWidth = round(Math.max(0, at(bandHi) - bandLeft), 1);
  const status = statusOf(metricKey, value, zone);

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: metric.tone }} />
          <span className="truncate text-[12px] text-neutral-600" style={body}>
            {metric.label}
          </span>
        </span>
        <span className="shrink-0 tabular-nums" style={body}>
          <span
            className="text-[14px] font-semibold"
            style={{ ...display, color: STATUS_TONE[status].color }}
          >
            {formatValue(metricKey, value)}
          </span>
          <span className="text-[10px] text-neutral-400"> {metric.unit}</span>
        </span>
      </div>

      <div className="relative mt-1.5 h-2.5 overflow-hidden rounded-full bg-[#F3F7F6]">
        <span
          className="absolute inset-y-0 bg-[#45DFB1]/25"
          style={{ left: `${bandLeft}%`, width: `${bandWidth}%` }}
        />
        <span
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ width: `${at(value)}%`, backgroundColor: metric.tone, opacity: 0.85 }}
        />
      </div>

      <div className="mt-1 flex justify-between text-[10px] text-neutral-400 tabular-nums" style={body}>
        <span>{lo}</span>
        <span>
          Target {bandLo} to {bandHi}
        </span>
        <span>{hi}</span>
      </div>
    </div>
  );
}
