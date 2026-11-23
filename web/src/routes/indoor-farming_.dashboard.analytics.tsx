import { createFileRoute } from "@tanstack/react-router";
import { body, display } from "../lib/fonts";
import {
  AERIAL_KEYS,
  POINTS_PER_DAY,
  ROOT_KEYS,
  ZONES,
  dashboardScreen,
  formatValue,
  metricsFor,
  seriesFor,
  statusOf,
  zonesFor,
} from "../lib/indoor-dashboard";
import { headLang, useLang, useT } from "../lib/i18n";
import { useDashboard } from "../lib/dashboard-state";
import { Panel } from "../components/dashboard/parts";
import { ScreenHeading } from "../components/dashboard/AppShell";

export const Route = createFileRoute("/indoor-farming_/dashboard/analytics")({
  component: AnalyticsScreen,
  head: ({ matches }) => ({ meta: [{ title: headLang(matches) === "id" ? "Analitik · Dashboard | smartagri" : "Analytics · Dashboard | smartagri" }] }),
});


// Metrics that are schedule-driven rather than controlled: a dark room at 02:00
// and a closed valve are correct states, so scoring them as time out of band
// would report a well run facility as failing.
const SCHEDULED = new Set(["ppfd", "dli", "flow"]);

/** Share of the day so far that a metric spent inside its band, as a percent. */
function timeInBand(zone: (typeof ZONES)[number], key: (typeof AERIAL_KEYS)[number], upTo: number) {
  const series = seriesFor(zone, key);
  let inside = 0;
  for (let i = 0; i <= upTo; i++) {
    if (statusOf(key, series[i], zone) === "optimal") inside++;
  }
  return Math.round((inside / (upTo + 1)) * 100);
}

function AnalyticsScreen() {
  const { tick, zone } = useDashboard();
  const lang = useLang();
  const t = useT();
  const NAV = dashboardScreen("/indoor-farming/dashboard/analytics", lang);
  const METRICS = metricsFor(lang);
  const keys = [...AERIAL_KEYS, ...ROOT_KEYS].filter((k) => !SCHEDULED.has(k));
  const online = zonesFor(lang).filter((z) => z.online);

  return (
    <>
      <ScreenHeading title={NAV.label} blurb={NAV.blurb} />

      <Panel
        title={`${t({ en: "Time in band", id: "Waktu dalam rentang" })} · ${zone.short}`}
        action={
          <span className="text-[11px] text-neutral-400" style={body}>
            {t({ en: "Midnight to", id: "Tengah malam sampai" })} {String(Math.floor((tick * 15) / 60)).padStart(2, "0")}:
            {String((tick * 15) % 60).padStart(2, "0")}
          </span>
        }
      >
        {zone.online ? (
          <div className="flex flex-col gap-2.5">
            {keys.map((k) => {
              const pct = timeInBand(zone, k, tick);
              const tone = pct >= 90 ? "#0E9F6E" : pct >= 70 ? "#C58A00" : "#C4342F";
              return (
                <div key={k} className="flex items-center gap-3">
                  <span className="w-[38%] shrink-0 truncate text-[12px] text-neutral-600" style={body}>
                    {METRICS[k].label}
                  </span>
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-[#F3F7F6]">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${pct}%`, backgroundColor: tone }}
                    />
                  </div>
                  <span
                    className="w-11 shrink-0 text-right text-[12px] font-semibold tabular-nums"
                    style={{ ...display, color: tone }}
                  >
                    {pct}%
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="py-8 text-center text-[13px] text-neutral-400" style={body}>
            {t({
              en: `${zone.name} is offline, so there is nothing to score.`,
              id: `${zone.name} sedang offline, jadi tidak ada yang bisa dinilai.`,
            })}
          </p>
        )}
      </Panel>

      <Panel title={t({ en: "Day extremes by room", id: "Nilai ekstrem harian per ruang" })}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] border-collapse text-left">
            <thead>
              <tr className="text-[11px] text-neutral-400">
                <th className="pb-2 pr-3 font-medium" style={body}>{t({ en: "Room", id: "Ruang" })}</th>
                <th className="pb-2 pr-3 font-medium" style={body}>{t({ en: "Air temp min", id: "Suhu udara min" })}</th>
                <th className="pb-2 pr-3 font-medium" style={body}>{t({ en: "Air temp max", id: "Suhu udara maks" })}</th>
                <th className="pb-2 pr-3 font-medium" style={body}>{t({ en: "VPD max", id: "VPD maks" })}</th>
                <th className="pb-2 font-medium" style={body}>{t({ en: "Peak PPFD", id: "PPFD puncak" })}</th>
              </tr>
            </thead>
            <tbody>
              {online.map((z) => {
                const temp = seriesFor(z, "airTemp");
                const vpd = seriesFor(z, "vpd");
                const ppfd = seriesFor(z, "ppfd");
                return (
                  <tr key={z.id} className="border-t border-[#0B6477]/8">
                    <td className="py-2.5 pr-3 text-[13px] font-medium text-neutral-800" style={body}>
                      {z.short}
                    </td>
                    <td className="py-2.5 pr-3 text-[13px] text-neutral-600 tabular-nums" style={body}>
                      {formatValue("airTemp", Math.min(...temp), lang)} °C
                    </td>
                    <td className="py-2.5 pr-3 text-[13px] text-neutral-600 tabular-nums" style={body}>
                      {formatValue("airTemp", Math.max(...temp), lang)} °C
                    </td>
                    <td className="py-2.5 pr-3 text-[13px] text-neutral-600 tabular-nums" style={body}>
                      {formatValue("vpd", Math.max(...vpd), lang)} kPa
                    </td>
                    <td className="py-2.5 text-[13px] text-neutral-600 tabular-nums" style={body}>
                      {Math.round(Math.max(...ppfd))} µmol/m²/s
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-[11px] text-neutral-400" style={body}>
          {t({
            en: `Figures cover the full modelled day (${POINTS_PER_DAY} samples at 15 minute intervals), not only the part played so far.`,
            id: `Angka mencakup seluruh hari yang dimodelkan (${POINTS_PER_DAY} sampel dengan interval 15 menit), bukan hanya bagian yang sudah diputar.`,
          })}
        </p>
      </Panel>
    </>
  );
}
