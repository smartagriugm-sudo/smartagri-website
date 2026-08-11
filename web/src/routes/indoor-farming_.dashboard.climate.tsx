import { createFileRoute } from "@tanstack/react-router";
import { body, display } from "../lib/fonts";
import {
  DASHBOARD_NAV,
  METRICS,
  STATUS_TONE,
  formatValue,
  statusOf,
  targetFor,
} from "../lib/indoor-dashboard";
import { useDashboard } from "../lib/dashboard-state";
import { Panel } from "../components/dashboard/parts";
import { ScreenHeading } from "../components/dashboard/AppShell";
import { DayChart } from "../components/dashboard/parts";
import { CHART_KEYS, AERIAL_KEYS } from "../lib/indoor-dashboard";
import { Pill } from "../components/dashboard/parts";

export const Route = createFileRoute("/indoor-farming_/dashboard/climate")({
  component: ClimateScreen,
  head: () => ({ meta: [{ title: "Climate · Dashboard | smartagri" }] }),
});

const NAV = DASHBOARD_NAV.find((n) => n.label === "Climate")!;

// Aerial environment, one zone at a time, against the outdoor weather that is
// driving it. The pairing is the point: a rising VPD at midday reads very
// differently when the solar figure beside it explains why.
function ClimateScreen() {
  const { zone, tick, metricKey, setMetricKey, chartSeries, reading, weather, WeatherIcon, rain } =
    useDashboard();

  return (
    <>
      <ScreenHeading title="Climate" blurb={NAV.blurb} />

      <div className="grid gap-3 lg:grid-cols-[1.6fr_1fr]">
        <Panel
          title={`${METRICS[metricKey].label} · ${zone.short}`}
          action={
            <div className="flex flex-wrap gap-1.5">
              {CHART_KEYS.filter((k) => AERIAL_KEYS.includes(k)).map((k) => (
                <Pill key={k} active={k === metricKey} onClick={() => setMetricKey(k)}>
                  {METRICS[k].short}
                </Pill>
              ))}
            </div>
          }
        >
          {zone.online ? (
            <DayChart series={chartSeries} metricKey={metricKey} tick={tick} zone={zone} />
          ) : (
            <p className="py-10 text-center text-[13px] text-neutral-400" style={body}>
              {zone.name} is offline. Pick another zone to see its climate.
            </p>
          )}
        </Panel>

        <div className="flex flex-col gap-3">
          <Panel title="Outdoor weather">
            <div className="flex items-center gap-4">
              <WeatherIcon className="w-10 h-10 shrink-0 text-[#14919B]" strokeWidth={1.5} />
              <div>
                <div
                  className="text-[26px] font-semibold tracking-[-0.03em] text-neutral-900 tabular-nums leading-none"
                  style={display}
                >
                  {weather.airTemp.toFixed(1)} °C
                </div>
                <div className="mt-1 text-[12px] text-neutral-500" style={body}>
                  {weather.condition}
                </div>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {[
                { label: "Solar", value: `${Math.round(weather.solar)} W/m²` },
                { label: "Humidity", value: `${Math.round(weather.rh)} %` },
                { label: "Wind", value: `${weather.wind.toFixed(1)} m/s` },
                { label: "Rain today", value: `${rain.toFixed(1)} mm` },
              ].map((r) => (
                <div key={r.label} className="rounded-xl bg-[#F3F7F6] px-3 py-2.5">
                  <div className="text-[10px] text-neutral-400" style={body}>
                    {r.label}
                  </div>
                  <div
                    className="text-[14px] font-semibold text-neutral-900 tabular-nums"
                    style={display}
                  >
                    {r.value}
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title={`Aerial readings · ${zone.short}`}>
            {zone.online ? (
              <div className="flex flex-col gap-2">
                {AERIAL_KEYS.map((k) => {
                  const status = statusOf(k, reading[k], zone);
                  const [lo, hi] = targetFor(k, zone);
                  return (
                    <div key={k} className="flex items-center gap-3">
                      <span className="min-w-0 flex-1 text-[12px] text-neutral-600 truncate" style={body}>
                        {METRICS[k].label}
                      </span>
                      <span className="text-[10px] text-neutral-400 shrink-0" style={body}>
                        {lo} to {hi}
                      </span>
                      <span
                        className="w-20 text-right text-[13px] font-semibold tabular-nums shrink-0"
                        style={{ ...display, color: STATUS_TONE[status].color }}
                      >
                        {formatValue(k, reading[k])}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="py-6 text-center text-[13px] text-neutral-400" style={body}>
                Zone offline.
              </p>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}
