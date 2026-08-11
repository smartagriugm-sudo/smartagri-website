import { createFileRoute } from "@tanstack/react-router";
import { body } from "../lib/fonts";
import {
  DASHBOARD_NAV,
  METRICS,
  ZONES,
  formatValue,
  readingAt,
  targetFor,
} from "../lib/indoor-dashboard";
import { useDashboard } from "../lib/dashboard-state";
import { Panel } from "../components/dashboard/parts";
import { ScreenHeading } from "../components/dashboard/AppShell";
import { Ring } from "../components/dashboard/parts";
import { ROOT_KEYS } from "../lib/indoor-dashboard";

export const Route = createFileRoute("/indoor-farming_/dashboard/nutrition")({
  component: NutritionScreen,
  head: () => ({ meta: [{ title: "Nutrition · Dashboard | smartagri" }] }),
});

const NAV = DASHBOARD_NAV.find((n) => n.label === "Nutrition")!;

// Root zone chemistry for every online zone at once. Nutrition is the one area
// where a facility-wide view beats a per-zone one: the zones share a mixing
// tank, so a drift in one is usually the first sign of a drift in all of them.
function NutritionScreen() {
  const { tick } = useDashboard();
  const online = ZONES.filter((z) => z.online);

  return (
    <>
      <ScreenHeading title="Nutrition" blurb={NAV.blurb} />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {online.map((z) => {
          const reading = readingAt(z, tick);
          return (
            <Panel key={z.id} title={z.short}>
              <div className="flex flex-col gap-3">
                {ROOT_KEYS.filter((k) => k !== "flow").map((k) => (
                  <div key={k} className="flex items-center gap-3">
                    <Ring value={reading[k]} metricKey={k} zone={z} />
                    <div className="min-w-0">
                      <div className="text-[11px] text-neutral-500 truncate" style={body}>
                        {METRICS[k].short}
                      </div>
                      <div className="text-[10px] text-neutral-400" style={body}>
                        {targetFor(k, z)[0]} to {targetFor(k, z)[1]} {METRICS[k].unit}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          );
        })}
      </div>

      <Panel title="Dosing and delivery">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-left">
            <thead>
              <tr className="text-[11px] text-neutral-400">
                <th className="pb-2 pr-3 font-medium" style={body}>Room</th>
                <th className="pb-2 pr-3 font-medium" style={body}>Feed strength</th>
                <th className="pb-2 pr-3 font-medium" style={body}>pH</th>
                <th className="pb-2 pr-3 font-medium" style={body}>Dissolved O2</th>
                <th className="pb-2 font-medium" style={body}>Flow to canopy</th>
              </tr>
            </thead>
            <tbody>
              {online.map((z) => {
                const r = readingAt(z, tick);
                return (
                  <tr key={z.id} className="border-t border-[#0B6477]/8">
                    <td className="py-2.5 pr-3 text-[13px] font-medium text-neutral-800" style={body}>
                      {z.short}
                    </td>
                    <td className="py-2.5 pr-3 text-[13px] text-neutral-600 tabular-nums" style={body}>
                      {formatValue("ec", r.ec)} mS/cm
                    </td>
                    <td className="py-2.5 pr-3 text-[13px] text-neutral-600 tabular-nums" style={body}>
                      {formatValue("ph", r.ph)}
                    </td>
                    <td className="py-2.5 pr-3 text-[13px] text-neutral-600 tabular-nums" style={body}>
                      {formatValue("dissolvedOxygen", r.dissolvedOxygen)} mg/L
                    </td>
                    <td className="py-2.5 text-[13px] text-neutral-600 tabular-nums" style={body}>
                      {formatValue("flow", r.flow)} L/min
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}
