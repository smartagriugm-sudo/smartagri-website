import { createFileRoute } from "@tanstack/react-router";
import { body, display } from "../lib/fonts";
import {
  AERIAL_KEYS,
  DASHBOARD_NAV,
  METRICS,
  ROOT_KEYS,
} from "../lib/indoor-dashboard";
import { Panel } from "../components/dashboard/parts";
import { ScreenHeading } from "../components/dashboard/AppShell";

export const Route = createFileRoute("/indoor-farming_/dashboard/calibration")({
  component: CalibrationScreen,
  head: () => ({ meta: [{ title: "Calibration · Dashboard | smartagri" }] }),
});

const NAV = DASHBOARD_NAV.find((n) => n.label === "Calibration")!;

// Calibration intervals per parameter, in days. Wet chemistry drifts fastest,
// which is why pH and EC head the list; a solid state CO2 or PAR sensor holds
// its calibration for a season.
const INTERVAL_DAYS: Partial<Record<string, number>> = {
  ph: 14,
  ec: 30,
  dissolvedOxygen: 30,
  co2: 180,
  ppfd: 365,
  airTemp: 180,
  rh: 180,
  waterTemp: 180,
  leafTemp: 180,
};

// Days since each parameter was last checked. Fixed values rather than dates
// computed at render time: the demo must produce identical markup on the server
// and in the browser, and a clock read during render would break that.
const DAYS_SINCE: Partial<Record<string, number>> = {
  ph: 9,
  ec: 21,
  dissolvedOxygen: 27,
  co2: 63,
  ppfd: 120,
  airTemp: 45,
  rh: 45,
  waterTemp: 88,
  leafTemp: 150,
};

function CalibrationScreen() {
  const rows = [...AERIAL_KEYS, ...ROOT_KEYS]
    .filter((k) => INTERVAL_DAYS[k] != null)
    .map((k) => {
      const interval = INTERVAL_DAYS[k]!;
      const since = DAYS_SINCE[k] ?? 0;
      const due = interval - since;
      return { key: k, interval, since, due };
    })
    .sort((a, b) => a.due - b.due);

  return (
    <>
      <ScreenHeading title="Calibration" blurb={NAV.blurb} />

      <Panel
        title="Calibration schedule"
        action={
          <span className="text-[11px] text-neutral-400" style={body}>
            Sorted by what falls due first
          </span>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left">
            <thead>
              <tr className="text-[11px] text-neutral-400">
                <th className="pb-2 pr-3 font-medium" style={body}>Parameter</th>
                <th className="pb-2 pr-3 font-medium" style={body}>Instrument</th>
                <th className="pb-2 pr-3 font-medium" style={body}>Interval</th>
                <th className="pb-2 pr-3 font-medium" style={body}>Last checked</th>
                <th className="pb-2 font-medium" style={body}>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const metric = METRICS[r.key];
                const overdue = r.due <= 0;
                const soon = r.due > 0 && r.due <= 7;
                const tone = overdue ? "#C4342F" : soon ? "#C58A00" : "#0E9F6E";
                return (
                  <tr key={r.key} className="border-t border-[#0B6477]/8">
                    <td className="py-2.5 pr-3" style={body}>
                      <span className="flex items-center gap-2">
                        <metric.icon className="w-3.5 h-3.5 shrink-0" style={{ color: metric.tone }} />
                        <span className="text-[13px] font-medium text-neutral-800">
                          {metric.label}
                        </span>
                      </span>
                    </td>
                    <td className="py-2.5 pr-3 text-[12px] text-neutral-500" style={body}>
                      {metric.sensor}
                    </td>
                    <td className="py-2.5 pr-3 text-[13px] text-neutral-600 tabular-nums" style={body}>
                      {r.interval} days
                    </td>
                    <td className="py-2.5 pr-3 text-[13px] text-neutral-600 tabular-nums" style={body}>
                      {r.since} days ago
                    </td>
                    <td className="py-2.5" style={body}>
                      <span
                        className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium"
                        style={{ color: tone, backgroundColor: `${tone}1A` }}
                      >
                        {overdue
                          ? `${Math.abs(r.due)} days overdue`
                          : soon
                            ? `Due in ${r.due} days`
                            : `Due in ${r.due} days`}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel title="How we calibrate">
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            {
              title: "pH and conductivity",
              body: "Two point calibration against fresh buffer, pH 4.01 and 7.00, and a 1413 µS/cm conductivity standard. Probes are cleaned and inspected at the same visit.",
            },
            {
              title: "Dissolved oxygen",
              body: "Single point in water saturated air, corrected for temperature and local barometric pressure. Membrane and electrolyte replaced when response time lengthens.",
            },
            {
              title: "Light and CO2",
              body: "PAR sensors checked against a reference quantum sensor under the same fixture. CO2 verified with a certified span gas, with a fresh air zero as a cross check.",
            },
          ].map((c) => (
            <div key={c.title} className="rounded-xl border border-[#0B6477]/8 bg-[#FAFCFB] p-4">
              <h3 className="text-[13px] font-medium text-neutral-900" style={display}>
                {c.title}
              </h3>
              <p className="mt-1.5 text-[12px] text-neutral-500 leading-relaxed" style={body}>
                {c.body}
              </p>
            </div>
          ))}
        </div>
      </Panel>
    </>
  );
}
