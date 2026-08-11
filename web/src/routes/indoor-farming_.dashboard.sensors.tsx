import { createFileRoute } from "@tanstack/react-router";
import { body } from "../lib/fonts";
import {
  DASHBOARD_NAV,
  METRICS,
  STATUS_TONE,
  ZONES,
  formatValue,
  readingAt,
  statusOf,
} from "../lib/indoor-dashboard";
import { useDashboard } from "../lib/dashboard-state";
import { Panel } from "../components/dashboard/parts";
import { ScreenHeading } from "../components/dashboard/AppShell";
import { AERIAL_KEYS, ROOT_KEYS } from "../lib/indoor-dashboard";
import { CircleDot } from "lucide-react";

export const Route = createFileRoute("/indoor-farming_/dashboard/sensors")({
  component: SensorsScreen,
  head: () => ({ meta: [{ title: "Sensors · Dashboard | smartagri" }] }),
});

const NAV = DASHBOARD_NAV.find((n) => n.label === "Sensors")!;

// The instrument list behind the readings. Each metric names the sensor that
// produces it, so this screen is generated from the same METRICS table the
// rest of the dashboard reads: there is no second list to keep in step.
function SensorsScreen() {
  const { tick, devices } = useDashboard();
  const keys = [...AERIAL_KEYS, ...ROOT_KEYS];
  const online = ZONES.filter((z) => z.online);

  return (
    <>
      <ScreenHeading title="Sensors" blurb={NAV.blurb} />

      <Panel
        title="Deployed instruments"
        action={
          <span className="text-[11px] text-neutral-400" style={body}>
            {keys.length} parameters · {online.length} zones reporting
          </span>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-left">
            <thead>
              <tr className="text-[11px] text-neutral-400">
                <th className="pb-2 pr-3 font-medium" style={body}>Parameter</th>
                <th className="pb-2 pr-3 font-medium" style={body}>Instrument</th>
                {online.map((z) => (
                  <th key={z.id} className="pb-2 pr-3 font-medium text-right" style={body}>
                    {z.short}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {keys.map((k) => {
                const metric = METRICS[k];
                return (
                  <tr key={k} className="border-t border-[#0B6477]/8">
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
                    {online.map((z) => {
                      const r = readingAt(z, tick);
                      const status = statusOf(k, r[k], z);
                      return (
                        <td
                          key={z.id}
                          className="py-2.5 pr-3 text-right text-[13px] font-medium tabular-nums"
                          style={{ ...body, color: STATUS_TONE[status].color }}
                        >
                          {formatValue(k, r[k])}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="grid gap-3 lg:grid-cols-2">
        <Panel title="Zone reporting status">
          <div className="flex flex-col gap-2.5">
            {ZONES.map((z) => (
              <div key={z.id} className="flex items-center gap-3">
                <CircleDot
                  className="w-3.5 h-3.5 shrink-0"
                  style={{ color: z.online ? "#0E9F6E" : "#C4342F" }}
                />
                <span className="min-w-0 flex-1 text-[13px] text-neutral-700 truncate" style={body}>
                  {z.name}
                </span>
                <span
                  className="text-[12px] font-medium shrink-0"
                  style={{ ...body, color: z.online ? "#0E9F6E" : "#C4342F" }}
                >
                  {z.online ? "Reporting" : "No data"}
                </span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Actuators and plant">
          <div className="flex flex-col gap-2.5">
            {devices.map((d) => (
              <div key={d.name} className="flex items-center gap-3">
                <d.icon className="w-4 h-4 shrink-0 text-[#14919B]" />
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] text-neutral-700 truncate" style={body}>
                    {d.name}
                  </div>
                  <div className="text-[11px] text-neutral-400 truncate" style={body}>
                    {d.detail}
                  </div>
                </div>
                <span className="text-[12px] font-medium text-neutral-500 tabular-nums shrink-0" style={body}>
                  {d.state}
                </span>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </>
  );
}
