import { useEffect, useRef, useState } from "react";
import { formatValue, metricInfo, niceTicks, splitGaps, type RecipeTarget, type SeriesPoint } from "../../lib/pf/monitoring";

// One metric over time: a 2px line in the brand's teal, the recipe's band as a pale
// area behind it, a few faint gridlines, and a crosshair that reads the nearest
// point. A silence in the data stays a gap in the line. A single series has no
// legend: the card's title names it.

const HEIGHT = 260;
const LEFT = 44;
const RIGHT = 12;
const TOP = 12;
const BOTTOM = 26;
const LINE = "#14919B";

const timeLabel = (ms: number, spanHours: number) =>
  new Intl.DateTimeFormat("id-ID", spanHours <= 48 ? { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" } : { day: "numeric", month: "short", timeZone: "Asia/Jakarta" }).format(new Date(ms));

const fullTime = (ms: number) => new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" }).format(new Date(ms));

export default function SensorChart({ metric, points, stepMinutes, hours, band }: { metric: string; points: SeriesPoint[]; stepMinutes: number; hours: number; band: RecipeTarget | null }) {
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const measure = () => setWidth(el.clientWidth);
    measure();
    const seen = new ResizeObserver(measure);
    seen.observe(el);
    return () => seen.disconnect();
  }, []);

  const info = metricInfo(metric);
  const to = Date.now();
  const from = to - hours * 3_600_000;
  const plotW = Math.max(width - LEFT - RIGHT, 1);
  const plotH = HEIGHT - TOP - BOTTOM;

  const values = points.map((p) => p.v);
  const bounds = [...values, ...(band?.low != null ? [band.low] : []), ...(band?.high != null ? [band.high] : [])];
  const ticks = bounds.length ? niceTicks(Math.min(...bounds), Math.max(...bounds)) : [0, 1];
  const yMin = ticks[0];
  const yMax = ticks[ticks.length - 1];
  const x = (ms: number) => LEFT + ((ms - from) / (to - from)) * plotW;
  const y = (v: number) => TOP + (1 - (v - yMin) / (yMax - yMin || 1)) * plotH;

  const times = points.map((p) => new Date(p.t).getTime());
  const runs = splitGaps(points, stepMinutes);
  const path = (run: SeriesPoint[]) => run.map((p, i) => `${i ? "L" : "M"}${x(new Date(p.t).getTime()).toFixed(1)} ${y(p.v).toFixed(1)}`).join("");

  const tickCount = width < 480 ? 3 : 5;
  const xTicks = Array.from({ length: tickCount }, (_, i) => from + ((to - from) * i) / (tickCount - 1));

  const pick = (clientX: number) => {
    const rect = box.current?.getBoundingClientRect();
    if (!rect || points.length === 0) return;
    const at = from + ((clientX - rect.left - LEFT) / plotW) * (to - from);
    let best = 0;
    times.forEach((t, i) => {
      if (Math.abs(t - at) < Math.abs(times[best] - at)) best = i;
    });
    setHover(best);
  };

  const hovered = hover !== null ? points[hover] : null;
  const hx = hovered ? x(new Date(hovered.t).getTime()) : 0;
  const latest = points[points.length - 1];
  const summary = latest
    ? `${info.label} ${hours} jam terakhir, ${points.length} titik. Terakhir ${formatValue(metric, latest.v)} ${info.unit}, terendah ${formatValue(metric, Math.min(...values))}, tertinggi ${formatValue(metric, Math.max(...values))}.`
    : `${info.label}: belum ada bacaan pada rentang ini.`;

  return (
    <div>
      <div ref={box} className="relative" style={{ height: HEIGHT }} onPointerMove={(e) => pick(e.clientX)} onPointerDown={(e) => pick(e.clientX)} onPointerLeave={() => setHover(null)}>
        {width > 0 && (
          <svg width={width} height={HEIGHT} role="img" aria-label={summary} className="block touch-pan-y">
            {band && (band.low != null || band.high != null) && (
              <rect x={LEFT} width={plotW} y={y(band.high ?? yMax)} height={Math.max(y(band.low ?? yMin) - y(band.high ?? yMax), 0)} fill="#E3F4F4" />
            )}
            {ticks.map((t) => (
              <g key={t}>
                <line x1={LEFT} x2={LEFT + plotW} y1={y(t)} y2={y(t)} stroke="#E3ECED" strokeWidth={1} />
                <text x={LEFT - 8} y={y(t) + 4} textAnchor="end" fontSize={12} fill="#4F6B73" style={{ fontVariantNumeric: "tabular-nums" }}>{formatValue(metric, t)}</text>
              </g>
            ))}
            {xTicks.map((t, i) => (
              <text key={t} x={x(t)} y={HEIGHT - 8} textAnchor={i === 0 ? "start" : i === xTicks.length - 1 ? "end" : "middle"} fontSize={12} fill="#4F6B73" style={{ fontVariantNumeric: "tabular-nums" }}>{timeLabel(t, hours)}</text>
            ))}
            {runs.map((run) =>
              run.length === 1 ? (
                <circle key={run[0].t} cx={x(new Date(run[0].t).getTime())} cy={y(run[0].v)} r={3} fill={LINE} />
              ) : (
                <path key={run[0].t} d={path(run)} fill="none" stroke={LINE} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
              ),
            )}
            {hovered && (
              <>
                <line x1={hx} x2={hx} y1={TOP} y2={TOP + plotH} stroke="#9DB2B6" strokeWidth={1} />
                <circle cx={hx} cy={y(hovered.v)} r={4} fill={LINE} stroke="#FFFFFF" strokeWidth={2} />
              </>
            )}
          </svg>
        )}
        {hovered && (
          <div
            className="pointer-events-none absolute top-1 z-10 rounded-lg border border-[#DCE7E8] bg-white px-2.5 py-1.5 text-[12.5px] shadow-[0_2px_8px_rgba(8,49,58,0.12)]"
            style={hx > width / 2 ? { right: width - hx + 8 } : { left: hx + 8 }}
          >
            <p className="text-[#4F6B73]">{fullTime(new Date(hovered.t).getTime())}</p>
            <p className="font-medium tabular-nums text-[#0F2F36]">{formatValue(metric, hovered.v)} {info.unit}</p>
            {hovered.lo !== hovered.hi && <p className="tabular-nums text-[#4F6B73]">{formatValue(metric, hovered.lo)}–{formatValue(metric, hovered.hi)}</p>}
          </div>
        )}
      </div>
      {points.length > 0 && (
        <details className="mt-1 text-[13px]">
          <summary className="inline-flex min-h-[44px] cursor-pointer items-center font-medium text-[#0B6477] hover:underline sm:min-h-[24px]">Lihat sebagai tabel</summary>
          <div className="mt-1 max-h-[220px] overflow-y-auto">
            <table className="w-full text-left">
              <thead className="sticky top-0 bg-white text-[#4F6B73]"><tr><th className="py-1 font-medium">Waktu</th><th className="py-1 text-right font-medium">Rata-rata ({info.unit || "nilai"})</th></tr></thead>
              <tbody className="text-[#0F2F36]">
                {[...points].reverse().slice(0, 48).map((p) => (
                  <tr key={p.t} className="border-t border-[#EDF2F2]">
                    <td className="py-1">{fullTime(new Date(p.t).getTime())}</td>
                    <td className="py-1 text-right tabular-nums">{formatValue(metric, p.v)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </div>
  );
}
