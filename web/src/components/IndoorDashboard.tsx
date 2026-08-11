import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  Bell,
  ChevronDown,
  CircleDot,
  CloudRain,
  CloudSun,
  Droplets,
  Gauge,
  Minus,
  Pause,
  Play,
  Search,
  Settings,
  Sun,
  TrendingDown,
  TrendingUp,
  Wind,
  Workflow,
} from "lucide-react";
import { indoorDashboardImage } from "../lib/assets";
import PhotoSlot from "./PhotoSlot";
import { accent, body, display } from "../lib/fonts";
import {
  AERIAL_KEYS,
  CHART_KEYS,
  DASHBOARD_NAV,
  INITIAL_TICK,
  METRICS,
  POINTS_PER_DAY,
  ROOT_KEYS,
  STATUS_TONE,
  STEP_MINUTES,
  ZONES,
  type MetricKey,
  type Zone,
  alertsAt,
  axisPercent,
  clockLabel,
  deltaOver,
  devicesAt,
  formatValue,
  rainfallToDate,
  readingAt,
  round,
  sampleWeather,
  seriesFor,
  statusOf,
  targetFor,
} from "../lib/indoor-dashboard";

// The Indoor Farming control dashboard demo.
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

function Panel({
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

function Pill({
  active,
  children,
  onClick,
}: {
  active?: boolean;
  children: ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
        active
          ? "bg-[#0B6477] text-white"
          : "bg-[#F3F7F6] text-neutral-500 hover:text-[#0B6477] hover:bg-[#E4EFEC]"
      }`}
      style={body}
    >
      {children}
    </button>
  );
}

function StatusDot({ status }: { status: keyof typeof STATUS_TONE }) {
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

function TrendChip({ dir, text }: { dir: "up" | "down" | "flat"; text: string }) {
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

function Sparkline({
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
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width;
    const y = height - 2 - ((v - lo) / span) * (height - 4);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="shrink-0 overflow-visible"
      aria-hidden="true"
    >
      <polyline
        points={pts.join(" ")}
        fill="none"
        stroke={tone}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx={width}
        cy={Number(pts[pts.length - 1].split(",")[1])}
        r="2.4"
        fill={tone}
      />
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
/** Sample indices that get an hour label: 00:00, 06:00, 12:00, 18:00, 24:00. */
const HOUR_TICKS = [0, 24, 48, 72, POINTS_PER_DAY - 1];

function DayChart({
  series,
  metricKey,
  tick,
  zone,
}: {
  series: number[];
  metricKey: MetricKey;
  tick: number;
  zone: Zone;
}) {
  const metric = METRICS[metricKey];
  const [lo, hi] = metric.axis;
  const [hover, setHover] = useState<number | null>(null);
  const plotRef = useRef<HTMLDivElement>(null);

  // Rounded at the source: it keeps the serialised SVG small and keeps every
  // derived percentage short enough to survive the browser's CSS round trip,
  // which is what the absolutely positioned labels and tooltip depend on.
  const x = (i: number) => round((i / (POINTS_PER_DAY - 1)) * W, 1);
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
    const i = Math.round(ratio * (POINTS_PER_DAY - 1));
    setHover(Math.min(POINTS_PER_DAY - 1, Math.max(0, i)));
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
            aria-label={`${metric.label} across the day, in ${metric.unit || "index units"}`}
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
              <div className="text-[10px] text-neutral-400 tabular-nums">{clockLabel(marker)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* x axis */}
      <div className="relative ml-9 mt-1.5 h-4">
        {HOUR_TICKS.map((i, n) => (
          <span
            key={i}
            className={`absolute text-[10px] text-neutral-400 tabular-nums ${
              n === 0
                ? ""
                : n === HOUR_TICKS.length - 1
                  ? "-translate-x-full"
                  : "-translate-x-1/2"
            }`}
            style={{ ...body, left: `${pct(x(i), W)}%` }}
          >
            {i === POINTS_PER_DAY - 1 ? "24:00" : clockLabel(i)}
          </span>
        ))}
      </div>
    </div>
  );
}


/* ------------------------------------------------------------- ring gauge */

function Ring({
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

function KpiCard({ zone, metricKey, tick }: { zone: Zone; metricKey: MetricKey; tick: number }) {
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
            className="text-[19px] font-semibold tracking-[-0.02em] text-neutral-900 tabular-nums"
            style={display}
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
      <div className="hidden sm:flex flex-col items-end gap-1.5">
        <Sparkline values={window} tone={metric.tone} />
        <StatusDot status={status} />
      </div>
    </div>
  );
}

/* ---------------------------------------------------------- flow node card */

function FlowNode({
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

/* ------------------------------------------------------------ the shell */

export default function IndoorDashboard() {
  const [zoneId, setZoneId] = useState(ZONES[0].id);
  const [metricKey, setMetricKey] = useState<MetricKey>("vpd");
  const [tick, setTick] = useState(INITIAL_TICK);
  const [playing, setPlaying] = useState(true);

  const zone = ZONES.find((z) => z.id === zoneId) ?? ZONES[0];

  // The clock only starts after mount, so first paint matches the server.
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setTick((t) => (t + 1) % POINTS_PER_DAY);
    }, 2600);
    return () => clearInterval(id);
  }, [playing]);

  const reading = useMemo(() => readingAt(zone, tick), [zone, tick]);
  const chartSeries = useMemo(() => seriesFor(zone, metricKey), [zone, metricKey]);
  const weather = useMemo(() => sampleWeather(tick), [tick]);
  const rain = useMemo(() => rainfallToDate(tick), [tick]);
  const devices = useMemo(() => devicesAt(tick), [tick]);
  const alerts = useMemo(() => alertsAt(tick), [tick]);

  const onlineZones = ZONES.filter((z) => z.online);
  const totalArea = onlineZones.reduce((sum, z) => sum + z.area, 0);

  // A zone is healthy when every aerial and root metric sits inside its band.
  const zoneStatus = (z: Zone) => {
    if (!z.online) return "alert" as const;
    const r = readingAt(z, tick);
    // PPFD, DLI, and flow are all schedule-driven: a dark room at 02:00 and a
    // closed irrigation valve are correct states, not faults, so they are not
    // allowed to drag a zone's overall status down.
    const keys = [...AERIAL_KEYS, ...ROOT_KEYS].filter(
      (k) => k !== "flow" && k !== "dli" && k !== "ppfd",
    );
    const statuses = keys.map((k) => statusOf(k, r[k], z));
    if (statuses.includes("alert")) return "alert" as const;
    if (statuses.includes("watch")) return "watch" as const;
    return "optimal" as const;
  };

  const inBand = onlineZones.filter((z) => zoneStatus(z) === "optimal").length;
  const WeatherIcon =
    weather.condition === "Rain" ? CloudRain : weather.condition === "Clear" ? Sun : CloudSun;

  return (
    <div className="rounded-[26px] border border-white/15 bg-[#F3F7F6] p-2 shadow-[0_30px_80px_rgba(3,26,31,0.45)]">
      <div className="flex rounded-[20px] bg-white overflow-hidden">
        {/* ------------------------------------------------ sidebar */}
        <aside className="hidden lg:flex w-[212px] shrink-0 flex-col gap-1 border-r border-[#0B6477]/8 bg-[#FAFCFB] p-4">
          <div className="flex items-center gap-2 px-2 py-2 mb-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#0B6477]">
              <Gauge className="w-4 h-4 text-[#45DFB1]" />
            </span>
            <span
              className="text-[15px] font-semibold tracking-[-0.02em] text-neutral-900"
              style={display}
            >
              smartagri
            </span>
          </div>

          {DASHBOARD_NAV.map((item, i) => (
            <span
              key={item.label}
              className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-medium ${
                i === 0 ? "bg-[#0B6477]/8 text-[#0B6477]" : "text-neutral-500"
              }`}
              style={body}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </span>
          ))}

          <div className="mt-auto pt-4">
            <div className="overflow-hidden rounded-2xl bg-[#08313A]">
              <img
                src={indoorDashboardImage("promo-card.webp")}
                alt=""
                loading="lazy"
                decoding="async"
                className="h-24 w-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
              <div className="p-3.5">
                <div className="text-[13px] font-medium text-white leading-snug" style={display}>
                  Built and tested at UGM
                </div>
                <p className="mt-1 text-[11px] text-white/60 leading-relaxed" style={body}>
                  Every sensor on this screen runs in our own greenhouses first.
                </p>
              </div>
            </div>

            <div className="mt-3 flex items-center gap-2.5 rounded-xl px-2 py-2">
              <span
                className="flex h-8 w-8 items-center justify-center rounded-full bg-[#45DFB1] text-[12px] font-semibold text-[#0B2A22]"
                style={display}
              >
                SA
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[12px] font-medium text-neutral-800 truncate" style={body}>
                  Facility operator
                </div>
                <div className="text-[11px] text-neutral-400" style={body}>
                  Demo account
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
            </div>
          </div>
        </aside>

        {/* ------------------------------------------------ main */}
        <div className="min-w-0 flex-1 bg-[#F3F7F6] p-3 sm:p-4 flex flex-col gap-3">
          {/* top bar: utilities only. The greeting and headline live on the
              hero photo below, so the photo carries the top of the screen. */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex min-w-0 flex-1 items-center gap-2 h-9 max-w-[280px] rounded-xl border border-[#0B6477]/10 bg-white px-3">
              <Search className="w-4 h-4 shrink-0 text-neutral-300" />
              <span className="truncate text-[13px] text-neutral-300" style={body}>
                Search zones, sensors
              </span>
            </div>
            <div className="flex flex-1 items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setPlaying((p) => !p)}
                className="flex items-center gap-1.5 h-9 rounded-xl border border-[#0B6477]/10 bg-white px-3 text-[12px] font-medium text-[#0B6477] hover:bg-[#F3F7F6] transition-colors"
                style={body}
              >
                {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                {playing ? "Pause" : "Play"}
              </button>
              <span className="hidden sm:flex h-9 w-9 items-center justify-center rounded-xl border border-[#0B6477]/10 bg-white">
                <Bell className="w-4 h-4 text-neutral-400" />
              </span>
              <span className="hidden sm:flex h-9 w-9 items-center justify-center rounded-xl border border-[#0B6477]/10 bg-white">
                <Settings className="w-4 h-4 text-neutral-400" />
              </span>
            </div>
          </div>

          {/* Hero strip. Structured after the reference: the photo carries the
              band, the headline sits on it, and the summary and weather cards
              float over the image rather than beside it. */}
          <div className="relative overflow-hidden rounded-2xl bg-[#08313A] min-h-[210px]">
            <img
              src={indoorDashboardImage("facility-hero.webp")}
              alt=""
              loading="lazy"
              decoding="async"
              className="absolute inset-0 h-full w-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
            {/* Two overlays: a left-to-right wash so the headline stays legible
                over any photo, and a bottom lift so the glass cards separate
                from a bright canopy underneath them. */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#08313A]/95 via-[#08313A]/70 to-[#08313A]/25" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#08313A]/80 via-transparent to-transparent" />

            <div className="relative flex min-h-[210px] flex-col justify-between gap-4 p-4 sm:p-5">
              <div className="max-w-[560px]">
                <div className="text-[11px] font-medium text-[#45DFB1]" style={body}>
                  Smart Agriculture Research Center · Yogyakarta
                </div>
                <h2
                  className="mt-1 text-[19px] sm:text-[23px] font-semibold tracking-[-0.03em] leading-[1.15] text-white"
                  style={display}
                >
                  {inBand} of {onlineZones.length} zones are{" "}
                  <span style={{ ...accent, color: "#80ED99" }}>
                    inside their target envelope
                  </span>
                </h2>
              </div>

              <div className="flex flex-wrap items-end justify-between gap-3">
                {/* facility summary */}
                <div className="rounded-xl border border-white/15 bg-white/10 backdrop-blur-sm px-4 py-3">
                  <div className="flex items-center gap-4 sm:gap-5">
                    <div>
                      <div className="text-[11px] text-white/60" style={body}>
                        Zones online
                      </div>
                      <div
                        className="text-[21px] font-semibold tracking-[-0.03em] text-white tabular-nums leading-tight"
                        style={display}
                      >
                        {onlineZones.length}
                        <span className="text-[13px] font-normal text-white/50">
                          {" "}
                          / {ZONES.length}
                        </span>
                      </div>
                      <div className="text-[10px] text-white/50" style={body}>
                        1 in maintenance
                      </div>
                    </div>
                    <div className="h-10 w-px bg-white/15" />
                    <div>
                      <div className="text-[11px] text-white/60" style={body}>
                        Under control
                      </div>
                      <div
                        className="text-[21px] font-semibold tracking-[-0.03em] text-white tabular-nums leading-tight"
                        style={display}
                      >
                        {totalArea.toLocaleString("en-US")}
                        <span className="text-[13px] font-normal text-white/50"> m²</span>
                      </div>
                      <div className="text-[10px] text-white/50" style={body}>
                        across {onlineZones.length} zones
                      </div>
                    </div>
                    <div className="hidden sm:block h-10 w-px bg-white/15" />
                    <div className="hidden sm:block">
                      <div className="text-[11px] text-white/60" style={body}>
                        Facility clock
                      </div>
                      <div
                        className="text-[21px] font-semibold tracking-[-0.03em] text-white tabular-nums leading-tight"
                        style={display}
                      >
                        {clockLabel(tick)}
                      </div>
                      <div className="text-[10px] text-white/50" style={body}>
                        sampling every {STEP_MINUTES} min
                      </div>
                    </div>
                  </div>
                </div>

                {/* weather station */}
                <div className="rounded-xl border border-white/15 bg-white/10 backdrop-blur-sm px-4 py-3 min-w-[210px]">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="text-[11px] text-white/60" style={body}>
                        Weather station · outdoor
                      </div>
                      <div
                        className="text-[19px] font-semibold text-white tabular-nums leading-tight"
                        style={display}
                      >
                        {weather.airTemp.toFixed(1)} °C
                      </div>
                      <div className="text-[11px] text-white/60" style={body}>
                        {weather.condition}
                      </div>
                    </div>
                    <WeatherIcon className="w-8 h-8 text-[#45DFB1]" strokeWidth={1.5} />
                  </div>
                  <div className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-1">
                    {[
                      { label: "Solar", value: `${Math.round(weather.solar)} W/m²` },
                      { label: "Humidity", value: `${Math.round(weather.rh)} %` },
                      { label: "Wind", value: `${weather.wind.toFixed(1)} m/s` },
                      { label: "Rain today", value: `${rain.toFixed(1)} mm` },
                    ].map((row) => (
                      <div key={row.label} className="flex items-center justify-between gap-2">
                        <span className="text-[10px] text-white/50" style={body}>
                          {row.label}
                        </span>
                        <span
                          className="text-[11px] font-medium text-white tabular-nums"
                          style={body}
                        >
                          {row.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* zone switcher */}
          <div className="flex items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <span className="text-[12px] font-medium text-neutral-400 shrink-0" style={body}>
              Zone
            </span>
            {ZONES.map((z) => (
              <Pill key={z.id} active={z.id === zoneId} onClick={() => setZoneId(z.id)}>
                <span className="inline-flex items-center gap-1.5">
                  <CircleDot
                    className="w-3 h-3"
                    style={{ color: z.online ? "#0E9F6E" : "#C4342F" }}
                  />
                  {z.short}
                </span>
              </Pill>
            ))}
          </div>

          {/* KPI row */}
          <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
            {(["airTemp", "rh", "vpd", "co2"] as MetricKey[]).map((key) => (
              <div
                key={key}
                className="min-w-0 rounded-2xl border border-[#0B6477]/10 bg-white shadow-[0_1px_2px_rgba(8,49,58,0.04)]"
              >
                <KpiCard zone={zone} metricKey={key} tick={tick} />
              </div>
            ))}
          </div>

          {/* chart + root zone */}
          <div className="grid xl:grid-cols-[1.55fr_1fr] gap-3">
            <Panel
              className="flex flex-col"
              title={`${METRICS[metricKey].label} · ${zone.short}`}
              action={
                <div className="flex min-w-0 max-w-full items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {CHART_KEYS.map((key) => (
                    <Pill
                      key={key}
                      active={key === metricKey}
                      onClick={() => setMetricKey(key)}
                    >
                      {METRICS[key].short}
                    </Pill>
                  ))}
                </div>
              }
            >
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-1">
                <span
                  className="text-[30px] font-semibold tracking-[-0.03em] text-neutral-900 tabular-nums leading-none"
                  style={display}
                >
                  {formatValue(metricKey, chartSeries[tick])}
                </span>
                <span className="text-[13px] text-neutral-400" style={body}>
                  {METRICS[metricKey].unit}
                </span>
                <StatusDot status={statusOf(metricKey, chartSeries[tick], zone)} />
                <span className="text-[12px] text-neutral-400" style={body}>
                  Target band {targetFor(metricKey, zone)[0]} to {targetFor(metricKey, zone)[1]}
                </span>
              </div>
              <div className="flex-1 min-h-[250px]">
                <DayChart series={chartSeries} metricKey={metricKey} tick={tick} zone={zone} />
              </div>
              <p className="mt-1 text-[11px] text-neutral-400" style={body}>
                Solid line is measured to the playhead. The dashed continuation is the modelled
                rest of the day.
              </p>
            </Panel>

            <div className="flex min-w-0 flex-col gap-3">
              <Panel
                title="Root zone"
                action={
                  <span className="text-[11px] text-neutral-400" style={body}>
                    Mixing tank · 2,000 L
                  </span>
                }
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-3.5">
                  {(["ph", "ec", "dissolvedOxygen", "waterTemp"] as MetricKey[]).map((key) => (
                    <Ring key={key} metricKey={key} value={reading[key]} zone={zone} />
                  ))}
                </div>
              </Panel>

              <Panel title="Light and canopy">
                <div className="flex flex-col gap-3">
                  {(["ppfd", "dli", "leafTemp"] as MetricKey[]).map((key) => {
                    const m = METRICS[key];
                    const value = reading[key];
                    return (
                      <div key={key}>
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span
                            className="inline-flex items-center gap-1.5 text-[12px] font-medium text-neutral-600"
                            style={body}
                          >
                            <m.icon className="w-3.5 h-3.5" style={{ color: m.tone }} />
                            {m.label}
                          </span>
                          <span
                            className="text-[13px] font-semibold text-neutral-900 tabular-nums"
                            style={display}
                          >
                            {formatValue(key, value)}
                            <span className="ml-1 text-[10px] font-normal text-neutral-400">
                              {m.unit}
                            </span>
                          </span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-[#F3F7F6] overflow-hidden">
                          <div
                            className="h-full rounded-full transition-[width] duration-700 ease-out"
                            style={{
                              width: `${axisPercent(key, value)}%`,
                              backgroundColor: m.tone,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Panel>
            </div>
          </div>

          {/* zones table + equipment */}
          <div className="grid xl:grid-cols-[1.55fr_1fr] gap-3">
            <Panel title="Zone performance" padded={false}>
              <div className="overflow-x-auto px-5 pb-5">
                <table className="w-full min-w-[520px] border-collapse text-left">
                  <thead>
                    <tr className="text-[11px] text-neutral-400">
                      <th className="pb-2 pr-3 font-medium" style={body}>
                        Zone
                      </th>
                      <th className="pb-2 pr-3 font-medium" style={body}>
                        Crop
                      </th>
                      <th className="pb-2 pr-3 font-medium" style={body}>
                        Air
                      </th>
                      <th className="pb-2 pr-3 font-medium" style={body}>
                        VPD
                      </th>
                      <th className="pb-2 pr-3 font-medium" style={body}>
                        EC
                      </th>
                      <th className="pb-2 font-medium" style={body}>
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {ZONES.map((z) => {
                      const r = readingAt(z, tick);
                      const status = zoneStatus(z);
                      return (
                        <tr
                          key={z.id}
                          className={`border-t border-[#0B6477]/8 text-[13px] ${
                            z.id === zoneId ? "bg-[#F3F7F6]" : ""
                          }`}
                        >
                          <td className="py-2.5 pr-3" style={body}>
                            <button
                              type="button"
                              onClick={() => setZoneId(z.id)}
                              className="font-medium text-neutral-800 hover:text-[#0B6477] hover:underline text-left"
                            >
                              {z.short}
                            </button>
                          </td>
                          <td className="py-2.5 pr-3 text-neutral-500" style={body}>
                            {z.crop}
                          </td>
                          <td
                            className="py-2.5 pr-3 text-neutral-600 tabular-nums whitespace-nowrap"
                            style={body}
                          >
                            {z.online ? `${r.airTemp.toFixed(1)} °C` : "-"}
                          </td>
                          <td
                            className="py-2.5 pr-3 text-neutral-600 tabular-nums whitespace-nowrap"
                            style={body}
                          >
                            {z.online ? `${r.vpd.toFixed(2)} kPa` : "-"}
                          </td>
                          <td
                            className="py-2.5 pr-3 text-neutral-600 tabular-nums whitespace-nowrap"
                            style={body}
                          >
                            {z.online ? r.ec.toFixed(2) : "-"}
                          </td>
                          <td className="py-2.5">
                            {z.online ? (
                              <StatusDot status={status} />
                            ) : (
                              <span
                                className="text-[11px] font-medium text-neutral-400"
                                style={body}
                              >
                                Offline
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Panel>

            <Panel title="Equipment">
              <div className="flex flex-col gap-2.5">
                {devices.map((d) => (
                  <div key={d.name} className="flex items-center gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F3F7F6]">
                      <d.icon className="w-4 h-4 text-[#0B6477]" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-[12px] font-medium text-neutral-800 truncate" style={body}>
                        {d.name}
                      </div>
                      <div className="text-[11px] text-neutral-400 truncate" style={body}>
                        {d.detail}
                      </div>
                    </div>
                    <div className="w-16 shrink-0">
                      <div className="h-1.5 w-full rounded-full bg-[#F3F7F6] overflow-hidden">
                        <div
                          className="h-full rounded-full transition-[width] duration-700"
                          style={{
                            width: `${d.load}%`,
                            backgroundColor: d.state === "running" ? "#14919B" : "#C7D5D2",
                          }}
                        />
                      </div>
                      <div
                        className="mt-1 text-right text-[10px] text-neutral-400 tabular-nums"
                        style={body}
                      >
                        {d.state === "running" ? `${d.load}%` : d.state}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          </div>

          {/* system flow + event log */}
          <div className="grid xl:grid-cols-[1.55fr_1fr] gap-3">
            <Panel
              title="System flow"
              action={
                <span className="text-[11px] text-neutral-400" style={body}>
                  Closed loop · recirculating
                </span>
              }
            >
              {/* Laid out after the reference: the building sits in the middle
                  with what feeds it on the left and what it drives on the
                  right, so the panel reads as a loop rather than a list. On a
                  narrow screen it collapses to illustration then cards. */}
              <div className="flex flex-col sm:grid sm:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)_minmax(0,1fr)] sm:items-center gap-3">
                <div className="order-2 sm:order-1 grid grid-cols-2 sm:grid-cols-1 gap-2">
                  {[
                    {
                      label: "Weather station",
                      value: `${Math.round(weather.solar)} W/m²`,
                      icon: CloudSun,
                    },
                    {
                      label: "Nutrient tank",
                      value: `EC ${reading.ec.toFixed(2)}`,
                      icon: Droplets,
                    },
                  ].map((n) => (
                    <FlowNode key={n.label} {...n} />
                  ))}
                </div>

                <div className="order-1 sm:order-2">
                  {/* PhotoSlot rather than a bare img: this illustration carries
                      meaning, so while the file is missing it should degrade to
                      a branded placeholder instead of broken-image alt text. */}
                  <PhotoSlot
                    src={indoorDashboardImage("system-3d.webp")}
                    alt="Cutaway illustration of the greenhouse climate and irrigation loop"
                    icon={Workflow}
                    caption="Illustration: climate and irrigation loop"
                    ratio="aspect-[4/3]"
                  />
                </div>

                <div className="order-3 grid grid-cols-2 sm:grid-cols-1 gap-2">
                  {[
                    {
                      label: "Climate control",
                      value: `${reading.airTemp.toFixed(1)} °C`,
                      icon: Wind,
                    },
                    {
                      label: "To canopy",
                      value: `${reading.flow.toFixed(1)} L/min`,
                      icon: Gauge,
                    },
                  ].map((n) => (
                    <FlowNode key={n.label} {...n} />
                  ))}
                </div>
              </div>
            </Panel>

            <Panel
              title="Event log"
              action={
                <span
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-[#0B6477]"
                  style={body}
                >
                  View all
                  <ArrowRight className="w-3 h-3" />
                </span>
              }
            >
              <ul className="flex flex-col gap-3">
                {alerts.map((a, i) => (
                  <li key={`${a.zone}-${i}`} className="flex gap-2.5">
                    <span
                      className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: STATUS_TONE[a.level].color }}
                    />
                    <div className="min-w-0">
                      <div className="text-[12px] font-medium text-neutral-800" style={body}>
                        {a.zone}
                      </div>
                      <p className="text-[12px] text-neutral-500 leading-snug" style={body}>
                        {a.message}
                      </p>
                      <div className="text-[10px] text-neutral-400 mt-0.5" style={body}>
                        {a.ago}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </Panel>
          </div>
        </div>
      </div>
    </div>
  );
}
