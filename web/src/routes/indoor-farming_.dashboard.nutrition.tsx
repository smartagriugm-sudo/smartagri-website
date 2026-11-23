import { createFileRoute } from "@tanstack/react-router";
import { body } from "../lib/fonts";
import {
  dashboardScreen,
  formatValue,
  metricsFor,
  readingAt,
  targetFor,
  zonesFor,
} from "../lib/indoor-dashboard";
import { headLang, useLang, useT } from "../lib/i18n";
import { useDashboard } from "../lib/dashboard-state";
import { Panel } from "../components/dashboard/parts";
import { ScreenHeading } from "../components/dashboard/AppShell";
import { Ring, num } from "../components/dashboard/parts";
import { ROOT_KEYS } from "../lib/indoor-dashboard";

export const Route = createFileRoute("/indoor-farming_/dashboard/nutrition")({
  component: NutritionScreen,
  head: ({ matches }) => ({ meta: [{ title: headLang(matches) === "id" ? "Nutrisi · Dashboard | smartagri" : "Nutrition · Dashboard | smartagri" }] }),
});


// Root zone chemistry for every online zone at once. Nutrition is the one area
// where a facility-wide view beats a per-zone one: the zones share a mixing
// tank, so a drift in one is usually the first sign of a drift in all of them.
function NutritionScreen() {
  const { tick } = useDashboard();
  const lang = useLang();
  const t = useT();
  const NAV = dashboardScreen("/indoor-farming/dashboard/nutrition", lang);
  const METRICS = metricsFor(lang);
  const online = zonesFor(lang).filter((z) => z.online);

  return (
    <>
      <ScreenHeading title={NAV.label} blurb={NAV.blurb} />

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
                        {num(targetFor(k, z)[0], lang)} {t({ en: "to", id: "sampai" })} {num(targetFor(k, z)[1], lang)}{" "}
                        {METRICS[k].unit}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          );
        })}
      </div>

      <Panel title={t({ en: "Dosing and delivery", id: "Dosis dan penyaluran" })}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-left">
            <thead>
              <tr className="text-[11px] text-neutral-400">
                <th className="pb-2 pr-3 font-medium" style={body}>{t({ en: "Room", id: "Ruang" })}</th>
                <th className="pb-2 pr-3 font-medium" style={body}>{t({ en: "Feed strength", id: "Kepekatan nutrisi" })}</th>
                <th className="pb-2 pr-3 font-medium" style={body}>pH</th>
                <th className="pb-2 pr-3 font-medium" style={body}>{t({ en: "Dissolved O2", id: "O2 terlarut" })}</th>
                <th className="pb-2 font-medium" style={body}>{t({ en: "Flow to canopy", id: "Debit ke tanaman" })}</th>
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
                      {formatValue("ec", r.ec, lang)} mS/cm
                    </td>
                    <td className="py-2.5 pr-3 text-[13px] text-neutral-600 tabular-nums" style={body}>
                      {formatValue("ph", r.ph, lang)}
                    </td>
                    <td className="py-2.5 pr-3 text-[13px] text-neutral-600 tabular-nums" style={body}>
                      {formatValue("dissolvedOxygen", r.dissolvedOxygen, lang)} mg/L
                    </td>
                    <td className="py-2.5 text-[13px] text-neutral-600 tabular-nums" style={body}>
                      {formatValue("flow", r.flow, lang)} L/min
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
