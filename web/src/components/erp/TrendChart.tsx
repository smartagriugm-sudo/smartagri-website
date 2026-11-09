import { useEffect, useMemo, useRef, useState } from "react";
import { CartesianGrid, Line, LineChart, ReferenceArea, XAxis, YAxis } from "recharts";

// Lines over time, drawn with Recharts: one parameter on its axis, or several, each on an
// axis of its own in its own units. The reading follows the cursor: it opens beside the
// point nearest the pointer. Pointing at a line or at an axis brings that pair forward and
// quiets the others, so it stays clear which scale a line is read on. A silence in the data
// stays a gap in the line. The crosshair, dots and reading sit over the chart, on the same
// scale Recharts draws with, so they land exactly on the line.

export type TrendAxis = {
  /** Five values, so the axes share one set of gridlines. */
  ticks: number[];
  format: (value: number) => string;
  /** Above the axis: the unit, or the name where a parameter has none. */
  title: string;
};

export type TrendLine = {
  key: string;
  label: string;
  color: string;
  /** Given on every line of a combined chart; a single chart uses the chart's own ticks. */
  axis?: TrendAxis;
  /** The value as a person reads it, with its unit. */
  format: (value: number) => string;
};

export type TrendRow = { t: number; [key: string]: number | null };

const AXIS_WIDTH = 44;
const AXIS_SLOT = 48;
const AXIS_HEIGHT = 24;
const TOP = 8;
const TOP_WITH_TITLES = 26;
/** Room on the right for half of the last time label. */
const GUTTER = 20;
const GUTTER_WITH_AXES = 4;
/** Below this a combined chart keeps one axis, the one the line in focus is read on. */
const ALL_AXES_FROM_WIDTH = 440;
const TOOLTIP_WIDTH = 224;
const LINE_REACH = 14;
const SINGLE_AXIS = "y";

const axisTime = (ms: number, spanHours: number) =>
  new Intl.DateTimeFormat("en-GB", spanHours <= 48 ? { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" } : { day: "numeric", month: "short", timeZone: "Asia/Jakarta" }).format(new Date(ms));

const fullTime = (ms: number) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" }).format(new Date(ms));

const INK = "#4F6B73";
const QUIET = "#B4C3C6";
const tickStyle = { fontSize: 12, fill: INK, fontVariantNumeric: "tabular-nums" } as const;

export default function TrendChart({ lines, rows, from, to, height, yTicks = [0, 1], formatTick = String, band, summary, focus = null }: { lines: TrendLine[]; rows: TrendRow[]; from: number; to: number; height: number; yTicks?: number[]; formatTick?: (v: number) => string; band?: { low: number; high: number } | null; summary: string; focus?: string | null }) {
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [hover, setHover] = useState<{ index: number; y: number } | null>(null);
  const [axisHover, setAxisHover] = useState<string | null>(null);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const sized = new ResizeObserver(() => setWidth(el.clientWidth));
    sized.observe(el);
    setWidth(el.clientWidth);
    return () => sized.disconnect();
  }, []);

  const combined = lines.some((l) => l.axis);
  const allAxes = width >= ALL_AXES_FROM_WIDTH;
  const half = Math.ceil(lines.length / 2);
  const top = combined ? TOP_WITH_TITLES : TOP;
  const plotH = Math.max(height - top - AXIS_HEIGHT, 1);

  // The scale of a line: its own on a combined chart, the chart's otherwise.
  const ticksOf = (l: TrendLine) => l.axis?.ticks ?? yTicks;
  const py = (l: TrendLine, v: number) => {
    const t = ticksOf(l);
    const low = t[0];
    const high = t[t.length - 1];
    return top + (1 - (v - low) / (high - low || 1)) * plotH;
  };

  // Which line is under the pointer, read before the layout because a narrow chart's axis follows it.
  const row = hover ? rows[hover.index] : null;
  const present = row ? lines.filter((l) => typeof row[l.key] === "number") : [];
  const points = row ? present.map((l) => ({ line: l, y: py(l, row[l.key] as number) })) : [];
  const nearest = points.length && hover ? points.reduce((a, b) => (Math.abs(b.y - hover.y) < Math.abs(a.y - hover.y) ? b : a)) : null;
  const onLine = nearest && hover && Math.abs(nearest.y - hover.y) <= LINE_REACH ? nearest.line.key : null;
  const pointed = lines.length > 1 ? (axisHover ?? onLine ?? focus) : null;
  const active = lines.some((l) => l.key === pointed) ? pointed : null;

  // Half the axes on each side; on a narrow chart, one on the left.
  const leftAxes = combined ? (allAxes ? lines.slice(0, half) : [lines.find((l) => l.key === active) ?? lines[0]].filter(Boolean)) : [];
  const rightAxes = combined && allAxes ? lines.slice(half) : [];
  const plotLeft = combined ? leftAxes.length * AXIS_SLOT : AXIS_WIDTH;
  const edge = rightAxes.length > 0 ? GUTTER_WITH_AXES : GUTTER;
  const plotRight = rightAxes.length * AXIS_SLOT + edge;
  const plotW = Math.max(width - plotLeft - plotRight, 1);
  const px = (t: number) => plotLeft + ((t - from) / (to - from || 1)) * plotW;

  const spanHours = (to - from) / 3_600_000;
  const tickCount = plotW < 300 ? 3 : plotW < 560 ? 5 : 7;
  const xTicks = useMemo(() => Array.from({ length: tickCount }, (_, i) => from + ((to - from) * i) / (tickCount - 1)), [from, to, tickCount]);

  // Where each axis stands, from the outside in: Recharts stacks them in the order they are given.
  const axisAt = new Map<string, { x: number; side: "left" | "right" }>();
  leftAxes.forEach((l, i) => axisAt.set(l.key, { x: i * AXIS_SLOT, side: "left" }));
  rightAxes.forEach((l, i) => axisAt.set(l.key, { x: width - GUTTER_WITH_AXES - (i + 1) * AXIS_SLOT, side: "right" }));

  const pick = (clientX: number, clientY: number) => {
    const rect = box.current?.getBoundingClientRect();
    if (!rect || rows.length === 0) return;
    const x = clientX - rect.left;
    if (combined && (x < plotLeft || x > plotLeft + plotW)) {
      const axis = [...axisAt.entries()].find(([, a]) => x >= a.x && x < a.x + AXIS_SLOT);
      setAxisHover(axis ? axis[0] : null);
      setHover(null);
      return;
    }
    setAxisHover(null);
    const at = from + ((x - plotLeft) / plotW) * (to - from);
    let index = 0;
    for (let i = 1; i < rows.length; i++) if (Math.abs(rows[i].t - at) < Math.abs(rows[index].t - at)) index = i;
    setHover({ index, y: clientY - rect.top });
  };

  // Moving the crosshair must not redraw every line; only a change of focus or data does.
  const leftKeys = leftAxes.map((l) => l.key).join();
  const rightKeys = rightAxes.map((l) => l.key).join();
  const chart = useMemo(() => {
    if (width === 0) return null;
    const faded = (l: TrendLine) => active !== null && active !== l.key;
    return (
      <LineChart width={width} height={height} data={rows} margin={{ top, right: edge, bottom: 0, left: 0 }} accessibilityLayer={false}>
        <CartesianGrid vertical={false} stroke="#E3ECED" yAxisId={combined ? lines[0]?.key : SINGLE_AXIS} />
        <XAxis dataKey="t" type="number" scale="time" domain={[from, to]} ticks={xTicks} height={AXIS_HEIGHT} tickFormatter={(v: number) => axisTime(v, spanHours)} tick={tickStyle} tickLine={false} axisLine={{ stroke: "#C9D6D8" }} interval={0} allowDataOverflow />
        {combined ? (
          lines.map((l) => {
            const t = ticksOf(l);
            const shown = axisAt.get(l.key);
            return (
              <YAxis
                key={l.key}
                yAxisId={l.key}
                orientation={shown?.side ?? "left"}
                hide={!shown}
                type="number"
                domain={[t[0], t[t.length - 1]]}
                ticks={t}
                width={shown ? AXIS_SLOT : 0}
                interval={0}
                tickFormatter={l.axis?.format}
                tick={{ ...tickStyle, fill: faded(l) ? QUIET : active === l.key ? "#0F2F36" : INK }}
                tickLine={false}
                axisLine={{ stroke: l.color, strokeWidth: active === l.key ? 3 : 1.5, strokeOpacity: faded(l) ? 0.25 : 1 }}
                allowDataOverflow
              />
            );
          })
        ) : (
          <YAxis yAxisId={SINGLE_AXIS} type="number" domain={[yTicks[0], yTicks[yTicks.length - 1]]} ticks={yTicks} width={AXIS_WIDTH} tickFormatter={formatTick} tick={tickStyle} tickLine={false} axisLine={false} allowDataOverflow />
        )}
        {band && <ReferenceArea yAxisId={SINGLE_AXIS} y1={band.low} y2={band.high} fill={lines[0]?.color ?? "#14919B"} fillOpacity={0.09} stroke="none" ifOverflow="hidden" />}
        {lines.map((l) => (
          <Line key={l.key} yAxisId={combined ? l.key : SINGLE_AXIS} type="linear" name={l.label} dataKey={l.key} stroke={l.color} strokeWidth={active === l.key ? 3 : 2} strokeOpacity={faded(l) ? 0.2 : 1} dot={false} activeDot={false} isAnimationActive={false} connectNulls={false} />
        ))}
      </LineChart>
    );
    // The ticks of each axis follow from `lines`, and the axes' places from the keys below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, height, rows, lines, active, from, to, xTicks, leftKeys, rightKeys, yTicks, formatTick, band, top, combined, spanHours]);

  const hx = row ? px(row.t) : 0;
  // The reading opens beside the point nearest the pointer, and flips to stay inside the card.
  const anchor = nearest?.y ?? top;
  const tooltipH = 26 + 20 * Math.max(present.length, 1);
  const tooltipTop = Math.min(Math.max(anchor - tooltipH / 2, 0), height - tooltipH);
  const tooltipLeft = Math.max(hx + 14 + TOOLTIP_WIDTH > width ? hx - 14 - TOOLTIP_WIDTH : hx + 14, 0);

  return (
    <div
      ref={box}
      role="img"
      aria-label={summary}
      className="relative touch-pan-y select-none"
      style={{ height }}
      onPointerMove={(e) => pick(e.clientX, e.clientY)}
      onPointerDown={(e) => pick(e.clientX, e.clientY)}
      onPointerLeave={() => {
        setHover(null);
        setAxisHover(null);
      }}
    >
      {chart}

      {combined && [...axisAt.entries()].map(([key, a]) => {
        const line = lines.find((l) => l.key === key);
        return (
          <span
            key={key}
            className={`pointer-events-none absolute top-0 truncate text-[12px] leading-[18px] ${active === key ? "font-medium text-[#0F2F36]" : active ? "text-[#B4C3C6]" : "text-[#4F6B73]"}`}
            style={{ left: a.x, width: AXIS_SLOT, textAlign: a.side === "left" ? "right" : "left", paddingLeft: a.side === "right" ? 6 : 0, paddingRight: a.side === "left" ? 6 : 0 }}
          >
            {line?.axis?.title}
          </span>
        );
      })}

      {row && (
        <>
          <span className="pointer-events-none absolute w-px bg-[#9DB2B6]" style={{ left: hx, top, height: plotH }} />
          {points.map((p) => (
            <span key={p.line.key} className="pointer-events-none absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white" style={{ left: hx, top: p.y, background: p.line.color, opacity: active && active !== p.line.key ? 0.35 : 1 }} />
          ))}
          <div className="pointer-events-none absolute z-10 rounded-lg border border-[#DCE7E8] bg-white px-2.5 py-1.5 text-[12.5px] shadow-[0_2px_8px_rgba(8,49,58,0.12)]" style={{ left: tooltipLeft, top: tooltipTop, width: lines.length > 1 ? TOOLTIP_WIDTH : undefined }}>
            <p className="whitespace-nowrap text-[#4F6B73]">{fullTime(row.t)}</p>
            {present.length === 0 && <p className="text-[#4F6B73]">No readings</p>}
            {present.map((l) => (
              <p key={l.key} className="flex items-center justify-between gap-3 whitespace-nowrap">
                {lines.length > 1 && <span className={`flex min-w-0 items-center gap-1.5 ${active === l.key ? "font-medium text-[#0F2F36]" : "text-[#4F6B73]"}`}><span className="h-2 w-2 shrink-0 rounded-full" style={{ background: l.color }} /><span className="truncate">{l.label}</span></span>}
                <span className={`tabular-nums ${active && active !== l.key ? "text-[#4F6B73]" : "font-medium text-[#0F2F36]"}`}>{l.format(row[l.key] as number)}</span>
              </p>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
