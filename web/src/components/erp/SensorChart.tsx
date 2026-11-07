import { metricColor, mergeSeries } from "../../lib/pf/conditions";
import { formatValue, formatWithUnit, metricInfo, niceTicks, type RecipeTarget, type SeriesPoint } from "../../lib/pf/monitoring";
import TrendChart from "./TrendChart";

// One parameter over time, on its own axis and in its own colour, with the recipe's
// band behind the line. A single series has no legend: the card's title names it.

const DEFAULT_HEIGHT = 260;

const fullTime = (ms: number) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" }).format(new Date(ms));

export default function SensorChart({ metric, points, stepMinutes, hours, band, height = DEFAULT_HEIGHT, tableless = false, from, to }: { metric: string; points: SeriesPoint[]; stepMinutes: number; hours?: number; band: Pick<RecipeTarget, "low" | "high"> | null; height?: number; tableless?: boolean; from?: number; to?: number }) {
  const info = metricInfo(metric);
  const end = to ?? Date.now();
  const start = from ?? end - (hours ?? 24) * 3_600_000;

  const values = points.map((p) => p.v);
  const bounds = [...values, ...(band?.low != null ? [band.low] : []), ...(band?.high != null ? [band.high] : [])];
  const yTicks = bounds.length ? niceTicks(Math.min(...bounds), Math.max(...bounds)) : [0, 1];
  const latest = points[points.length - 1];
  const spanLabel = `${Math.round((end - start) / 3_600_000)} hours`;
  const summary = latest
    ? `${info.label} ${spanLabel}, ${points.length} points. Latest ${formatValue(metric, latest.v)} ${info.unit}, lowest ${formatValue(metric, Math.min(...values))}, highest ${formatValue(metric, Math.max(...values))}.`
    : `${info.label}: no readings in this range.`;

  return (
    <div>
      <TrendChart
        lines={[{ key: metric, label: info.label, color: metricColor(metric), format: (v) => formatWithUnit(metric, v) }]}
        rows={mergeSeries([{ key: metric, points }], stepMinutes)}
        from={start}
        to={end}
        height={height}
        yTicks={yTicks}
        formatTick={(v) => formatValue(metric, v)}
        band={band && (band.low != null || band.high != null) ? { low: band.low ?? yTicks[0], high: band.high ?? yTicks[yTicks.length - 1] } : null}
        summary={summary}
      />
      {points.length > 0 && !tableless && (
        <details className="mt-1 text-[13px]">
          <summary className="inline-flex min-h-[44px] cursor-pointer items-center font-medium text-[#0B6477] hover:underline sm:min-h-[24px]">View as a table</summary>
          <div className="mt-1 max-h-[220px] overflow-y-auto">
            <table className="w-full text-left">
              <thead className="sticky top-0 bg-white text-[#4F6B73]"><tr><th className="py-1 font-medium">Time</th><th className="py-1 text-right font-medium">Average ({info.unit || "nilai"})</th></tr></thead>
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
