import { createFileRoute } from "@tanstack/react-router";
import { body, display } from "../lib/fonts";
import {
  AERIAL_KEYS,
  DASHBOARD_NAV,
  METRICS,
  POINTS_PER_DAY,
  ROOT_KEYS,
  ZONES,
  formatValue,
  seriesFor,
  statusOf,
} from "../lib/indoor-dashboard";
import { useDashboard } from "../lib/dashboard-state";
import { Panel } from "../components/dashboard/parts";
import { ScreenHeading } from "../components/dashboard/AppShell";

export const Route = createFileRoute("/indoor-farming_/dashboard/analytics")({
  component: AnalyticsScreen,
  head: () => ({ meta: [{ title: "Analytics · Dashboard | smartagri" }] }),
});

const NAV = DASHBOARD_NAV.find((n) => n.label === "Analytics")!;

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
  const keys = [...AERIAL_KEYS, ...ROOT_KEYS].filter((k) => !SCHEDULED.has(k));
  const online = ZONES.filter((z) => z.online);

  return (
    <>
      <ScreenHeading title="Analytics" blurb={NAV.blurb} />

      <Panel
        title={`Time in band · ${zone.short}`}
        action={
          <span className="text-[11px] text-neutral-400" style={body}>
            Midnight to {String(Math.floor((tick * 15) / 60)).padStart(2, "0")}:
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
            {zone.name} is offline, so there is nothing to score.
          </p>
        )}
      </Panel>

      <Panel title="Day extremes by zone">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] border-collapse text-left">
            <thead>
              <tr className="text-[11px] text-neutral-400">
                <th className="pb-2 pr-3 font-medium" style={body}>Zone</th>
                <th className="pb-2 pr-3 font-medium" style={body}>Air temp min</th>
                <th className="pb-2 pr-3 font-medium" style={body}>Air temp max</th>
                <th className="pb-2 pr-3 font-medium" style={body}>VPD max</th>
                <th className="pb-2 font-medium" style={body}>Peak PPFD</th>
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
                      {formatValue("airTemp", Math.min(...temp))} °C
                    </td>
                    <td className="py-2.5 pr-3 text-[13px] text-neutral-600 tabular-nums" style={body}>
                      {formatValue("airTemp", Math.max(...temp))} °C
                    </td>
                    <td className="py-2.5 pr-3 text-[13px] text-neutral-600 tabular-nums" style={body}>
                      {formatValue("vpd", Math.max(...vpd))} kPa
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
          Figures cover the full modelled day ({POINTS_PER_DAY} samples at 15
          minute intervals), not only the part played so far.
        </p>
      </Panel>
    </>
  );
}
