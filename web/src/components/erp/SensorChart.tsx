import { metricColor, mergeSeries } from "../../lib/pf/conditions";
import { formatValue, formatWithUnit, metricInfo, metricLabel, niceTicks, type RecipeTarget, type SeriesPoint } from "../../lib/pf/monitoring";
import TrendChart from "./TrendChart";
import { localeOf, useLang, type Lang } from "../../lib/i18n";

// One parameter over time, on its own axis and in its own colour, with the recipe's
// band behind the line. A single series has no legend: the card's title names it.

const DEFAULT_HEIGHT = 260;

const fullTime = (ms: number, lang: Lang = "en") => new Intl.DateTimeFormat(lang === "id" ? localeOf(lang) : "en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" }).format(new Date(ms));

export default function SensorChart({ metric, points, stepMinutes, hours, band, height = DEFAULT_HEIGHT, tableless = false, from, to }: { metric: string; points: SeriesPoint[]; stepMinutes: number; hours?: number; band: Pick<RecipeTarget, "low" | "high"> | null; height?: number; tableless?: boolean; from?: number; to?: number }) {
  const lang = useLang();
  const id = lang === "id";
  const info = { ...metricInfo(metric), label: metricLabel(metric, lang) };
  const end = to ?? Date.now();
  const start = from ?? end - (hours ?? 24) * 3_600_000;

  const values = points.map((p) => p.v);
  const bounds = [...values, ...(band?.low != null ? [band.low] : []), ...(band?.high != null ? [band.high] : [])];
  const yTicks = bounds.length ? niceTicks(Math.min(...bounds), Math.max(...bounds)) : [0, 1];
  const latest = points[points.length - 1];
  const spanLabel = `${Math.round((end - start) / 3_600_000)} ${id ? "jam" : "hours"}`;
  const summary = latest
    ? id
      ? `${info.label} ${spanLabel}, ${points.length} titik. Terbaru ${formatValue(metric, latest.v, lang)} ${info.unit}, terendah ${formatValue(metric, Math.min(...values), lang)}, tertinggi ${formatValue(metric, Math.max(...values), lang)}.`
      : `${info.label} ${spanLabel}, ${points.length} points. Latest ${formatValue(metric, latest.v)} ${info.unit}, lowest ${formatValue(metric, Math.min(...values))}, highest ${formatValue(metric, Math.max(...values))}.`
    : id
      ? `${info.label}: tidak ada pembacaan di rentang ini.`
      : `${info.label}: no readings in this range.`;

  return (
    <div>
      <TrendChart
        lines={[{ key: metric, label: info.label, color: metricColor(metric), format: (v) => formatWithUnit(metric, v, lang) }]}
        rows={mergeSeries([{ key: metric, points }], stepMinutes)}
        from={start}
        to={end}
        height={height}
        yTicks={yTicks}
        formatTick={(v) => formatValue(metric, v, lang)}
        band={band && (band.low != null || band.high != null) ? { low: band.low ?? yTicks[0], high: band.high ?? yTicks[yTicks.length - 1] } : null}
        summary={summary}
      />
      {points.length > 0 && !tableless && (
        <details className="mt-1 text-[13px]">
          <summary className="inline-flex min-h-[44px] cursor-pointer items-center font-medium text-[#0B6477] hover:underline sm:min-h-[24px]">{id ? "Lihat sebagai tabel" : "View as a table"}</summary>
          <div className="mt-1 max-h-[220px] overflow-y-auto">
            <table className="w-full text-left">
              <thead className="sticky top-0 bg-white text-[#4F6B73]"><tr><th className="py-1 font-medium">{id ? "Waktu" : "Time"}</th><th className="py-1 text-right font-medium">{id ? "Rata-rata" : "Average"} ({info.unit || (id ? "nilai" : "value")})</th></tr></thead>
              <tbody className="text-[#0F2F36]">
                {[...points].reverse().slice(0, 48).map((p) => (
                  <tr key={p.t} className="border-t border-[#EDF2F2]">
                    <td className="py-1">{fullTime(new Date(p.t).getTime(), lang)}</td>
                    <td className="py-1 text-right tabular-nums">{formatValue(metric, p.v, lang)}</td>
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
